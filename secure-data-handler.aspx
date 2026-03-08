<%@ Page Language="C#" %>
<%@ Import Namespace="System.Configuration" %>
<%@ Import Namespace="System.IO" %>
<%@ Import Namespace="System.Text" %>
<%
    Response.ContentType = "application/json";
    Response.Cache.SetCacheability(HttpCacheability.NoCache);

    // Optional CORS support (disabled by default).
    // Configure with web.config appSettings key: SlidesetCorsAllowedOrigins
    // Example: <add key="SlidesetCorsAllowedOrigins" value="https://yourhost1,https://yourhost2" />
    // NOTE: If you rely on cookies (credentials: 'include'), CORS must echo an explicit origin (not '*').
    string requestOrigin = Request.Headers["Origin"];
    string allowedOriginsSetting = ConfigurationManager.AppSettings["SlidesetCorsAllowedOrigins"];
    bool corsAllowed = false;

    if (!string.IsNullOrEmpty(requestOrigin) && !string.IsNullOrEmpty(allowedOriginsSetting)) {
        string[] allowed = allowedOriginsSetting.Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries);
        foreach (string raw in allowed) {
            string origin = raw.Trim();
            if (!string.IsNullOrEmpty(origin) && string.Equals(origin, requestOrigin, StringComparison.OrdinalIgnoreCase)) {
                corsAllowed = true;
                break;
            }
        }
    }

    if (corsAllowed) {
        Response.AddHeader("Access-Control-Allow-Origin", requestOrigin);
        Response.AddHeader("Vary", "Origin");
        Response.AddHeader("Access-Control-Allow-Credentials", "true");
        Response.AddHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        Response.AddHeader("Access-Control-Allow-Headers", "Content-Type");
    }

    // Handle CORS preflight
    if (Request.HttpMethod == "OPTIONS") {
        Response.StatusCode = 200;
        Response.Write("{\"status\":\"success\",\"message\":\"preflight\"}");
        return;
    }

    // Persistent storage file (server-side). This is not directly writable from the browser.
    // The browser saves by POSTing JSON to this handler; the handler writes the file.
    //
    // Storage selection:
    // - If appSetting SlidesetDataFilePath is set, it is used first.
    // - Otherwise, tries ~/App_Data (may be ACL-restricted).
    // - Finally, falls back to system temp (usually writable, but may be cleaned by IT).
    string configuredDataPath = ConfigurationManager.AppSettings["SlidesetDataFilePath"];
    string disableTempFallbackSetting = ConfigurationManager.AppSettings["SlidesetDisableTempFallback"]; // "true"/"false"

    bool disableTempFallback = false;
    if (!string.IsNullOrEmpty(disableTempFallbackSetting)) {
        string v = disableTempFallbackSetting.Trim();
        disableTempFallback = string.Equals(v, "true", StringComparison.OrdinalIgnoreCase) || v == "1";
    }

    Func<string, string> resolvePath = (rawPath) => {
        if (string.IsNullOrEmpty(rawPath)) return null;
        string p = rawPath.Trim();
        if (string.IsNullOrEmpty(p)) return null;

        // Allow "~/..." and relative paths
        if (p.StartsWith("~/") || p.StartsWith("~\\")) {
            return Server.MapPath(p);
        }

        // Treat non-rooted as relative to the site root
        try {
            if (!Path.IsPathRooted(p)) {
                return Server.MapPath("~/" + p.TrimStart('/', '\\'));
            }
        } catch {
            // ignore
        }

        return p;
    };

    // Default to storing alongside this app under ~/CSTC_Slideset/App_Data (not the site-wide ~/App_Data)
    // because many IIS setups deny write access to the site-level App_Data.
    string defaultAppDataPath = Server.MapPath("~/CSTC_Slideset/App_Data/slideset-data.json");
    string legacySiteAppDataPath = Server.MapPath("~/App_Data/slideset-data.json");
    string tempFallbackPath = "C:\\Documents\\CSTC_Slideset\\slideset-data.json";

    var candidates = new System.Collections.Generic.List<string>();
    string configuredResolved = resolvePath(configuredDataPath);
    if (!string.IsNullOrEmpty(configuredResolved)) {
        candidates.Add(configuredResolved);
    }
    if (string.IsNullOrEmpty(configuredResolved) || !string.Equals(configuredResolved, defaultAppDataPath, StringComparison.OrdinalIgnoreCase)) {
        candidates.Add(defaultAppDataPath);
    }
    // Keep legacy path as a secondary fallback for older deployments.
    if (string.IsNullOrEmpty(configuredResolved) || !string.Equals(configuredResolved, legacySiteAppDataPath, StringComparison.OrdinalIgnoreCase)) {
        if (!string.Equals(legacySiteAppDataPath, defaultAppDataPath, StringComparison.OrdinalIgnoreCase)) {
            candidates.Add(legacySiteAppDataPath);
        }
    }
    if (!disableTempFallback) {
        candidates.Add(tempFallbackPath);
    }

    string[] candidatePaths = candidates.ToArray();
    
    try {
        string method = Request.HttpMethod;
        
        if (method == "GET") {
            string action = Request.QueryString["action"];
            
            if (action == "test") {
                Response.Write("{\"status\":\"success\",\"message\":\"Clean ASP.NET handler working\",\"timestamp\":\"" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "\"}");

            } else if (action == "storageInfo") {
                // Diagnostic endpoint (NOT public) to help identify where data is stored and
                // which identity IIS is using (important for file/UNC share permissions).
                if (Session["AuthToken"] == null) {
                    Response.StatusCode = 401;
                    Response.Write("{\"status\":\"error\",\"message\":\"Authentication required\"}");
                } else {
                    Func<string, string> esc = (s) => {
                        if (s == null) return "";
                        return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "\\r").Replace("\n", "\\n").Replace("\t", "\\t");
                    };

                    string winIdentity = "";
                    try { winIdentity = System.Security.Principal.WindowsIdentity.GetCurrent().Name; } catch { }

                    string httpIdentity = "";
                    try { httpIdentity = (Context != null && Context.User != null && Context.User.Identity != null) ? Context.User.Identity.Name : ""; } catch { }

                    string logonIdentity = "";
                    try { logonIdentity = (Request != null && Request.LogonUserIdentity != null) ? Request.LogonUserIdentity.Name : ""; } catch { }

                    string siteRoot = "";
                    string appDataRoot = "";
                    string handlerPhysicalPath = "";
                    try { siteRoot = Server.MapPath("~/"); } catch { }
                    try { appDataRoot = Server.MapPath("~/App_Data/"); } catch { }
                    try { handlerPhysicalPath = Server.MapPath(Request.Path); } catch { }

                    var candidatesJson = new StringBuilder();
                    candidatesJson.Append("[");
                    for (int i = 0; i < candidatePaths.Length; i++) {
                        if (i > 0) candidatesJson.Append(",");
                        candidatesJson.Append("\"");
                        candidatesJson.Append(esc(candidatePaths[i] ?? ""));
                        candidatesJson.Append("\"");
                    }
                    candidatesJson.Append("]");

                    string configuredResolvedForInfo = resolvePath(configuredDataPath) ?? "";

                    Response.Write(
                        "{\"status\":\"success\"," +
                        "\"storage\":{" +
                            "\"configuredRaw\":\"" + esc(configuredDataPath ?? "") + "\"," +
                            "\"configuredResolved\":\"" + esc(configuredResolvedForInfo) + "\"," +
                            "\"defaultAppDataPath\":\"" + esc(defaultAppDataPath) + "\"," +
                            "\"tempFallbackPath\":\"" + esc(tempFallbackPath) + "\"," +
                            "\"disableTempFallback\":" + (disableTempFallback ? "true" : "false") + "," +
                            "\"candidatePaths\":" + candidatesJson.ToString() + "," +
                            "\"appDataWebConfigDenied\":true" +
                        "}," +
                        "\"runtime\":{" +
                            "\"machineName\":\"" + esc(System.Environment.MachineName) + "\"," +
                            "\"windowsIdentity\":\"" + esc(winIdentity) + "\"," +
                            "\"httpIdentity\":\"" + esc(httpIdentity) + "\"," +
                            "\"logonUserIdentity\":\"" + esc(logonIdentity) + "\"," +
                            "\"siteRoot\":\"" + esc(siteRoot) + "\"," +
                            "\"appDataRoot\":\"" + esc(appDataRoot) + "\"," +
                            "\"handlerPhysicalPath\":\"" + esc(handlerPhysicalPath) + "\"" +
                        "}" +
                        "}"
                    );
                }
                
            } else if (action == "load") {
                // Allow public read access for slideshow or require authentication for controller
                string publicParam = Request.QueryString["public"];
                bool isPublicRequest = !string.IsNullOrEmpty(publicParam) && publicParam.ToLower() == "true";
                
                if (!isPublicRequest && Session["AuthToken"] == null) {
                    Response.StatusCode = 401;
                    Response.Write("{\"status\":\"error\",\"message\":\"Authentication required\"}");
                } else {
                    string storedData = "";
                    string loadMethod = "file_json";
                    string storagePathUsed = "";

                    // Prefer first readable candidate path
                    foreach (string p in candidatePaths) {
                        if (string.IsNullOrEmpty(p)) continue;
                        try {
                            if (File.Exists(p)) {
                                storedData = File.ReadAllText(p, Encoding.UTF8);
                                storagePathUsed = p;
                                break;
                            }
                        } catch {
                            // keep trying
                        }
                    }

                    // Fall back to Application cache if file isn't available
                    if (string.IsNullOrEmpty(storedData)) {
                        loadMethod = "fallback_application_state";
                        storedData = Application["SlidesetData"] as string;
                    }
                    
                    if (string.IsNullOrEmpty(storedData)) {
                        Response.Write("{\"status\":\"success\",\"data\":{\"settings\":{\"textDuration\":5000,\"plotDuration\":15000,\"notesDuration\":10000},\"commits\":[],\"users\":[],\"plotData\":[],\"statuses\":{},\"notes\":\"\",\"oli\":{\"annualGoal\":0,\"q1\":0,\"q2\":0,\"q3\":0,\"q4\":0}},\"message\":\"Data loaded (default)\",\"method\":\"" + loadMethod + "\"}");
                    } else {
                        string escapedPath = storagePathUsed.Replace("\\", "\\\\").Replace("\"", "\\\"");
                        Response.Write("{\"status\":\"success\",\"data\":" + storedData + ",\"message\":\"Data loaded\",\"method\":\"" + loadMethod + "\",\"storagePath\":\"" + escapedPath + "\"}");
                    }
                }
                
            } else {
                Response.Write("{\"status\":\"error\",\"message\":\"Unknown action\"}");
            }
            
        } else if (method == "POST") {
            StreamReader reader = new StreamReader(Request.InputStream);
            string requestData = reader.ReadToEnd();
            
            if (requestData.Contains("\"action\":\"authenticate\"")) {
                int passStart = requestData.IndexOf("\"password\":\"") + 12;
                if (passStart > 11) {
                    int passEnd = requestData.IndexOf("\"", passStart);
                    if (passEnd > passStart) {
                        string password = requestData.Substring(passStart, passEnd - passStart);
                        
                        if (!string.IsNullOrEmpty(password)) {
                            // Set session timeout to 4 hours (240 minutes)
                            Session.Timeout = 240;
                            Session["AuthToken"] = Guid.NewGuid().ToString();
                            Session["AuthTime"] = DateTime.Now;
                            
                            Response.Write("{\"status\":\"success\",\"message\":\"Authentication successful\",\"sessionToken\":\"" + Session["AuthToken"].ToString() + "\",\"expiresIn\":14400000,\"method\":\"aspnet_server_session\"}");
                        } else {
                            Response.Write("{\"status\":\"error\",\"message\":\"Password required\"}");
                        }
                    } else {
                        Response.Write("{\"status\":\"error\",\"message\":\"Invalid password format\"}");
                    }
                } else {
                    Response.Write("{\"status\":\"error\",\"message\":\"No password found\"}");
                }
            } else if (requestData.Contains("\"action\":\"save\"")) {
                if (Session["AuthToken"] == null) {
                    Response.StatusCode = 401;
                    Response.Write("{\"status\":\"error\",\"message\":\"Authentication required\"}");
                } else {
                    // Extract data from request
                    int dataStart = requestData.IndexOf("\"data\":") + 7;
                    if (dataStart > 6) {
                        // Find the end of the data object
                        int braceCount = 0;
                        int dataEnd = dataStart;
                        bool inQuotes = false;
                        
                        for (int i = dataStart; i < requestData.Length; i++) {
                            char c = requestData[i];
                            if (c == '"' && (i == 0 || requestData[i-1] != '\\')) {
                                inQuotes = !inQuotes;
                            } else if (!inQuotes) {
                                if (c == '{') braceCount++;
                                else if (c == '}') braceCount--;
                                
                                if (braceCount == 0) {
                                    dataEnd = i + 1;
                                    break;
                                }
                            }
                        }
                        
                        if (dataEnd > dataStart) {
                            string dataToSave = requestData.Substring(dataStart, dataEnd - dataStart);
                            
                            // Validate JSON before saving
                            try {
                                if (!dataToSave.TrimStart().StartsWith("{") || !dataToSave.TrimEnd().EndsWith("}")) {
                                    throw new Exception("Invalid JSON structure in data to save");
                                }
                            } catch (Exception validateEx) {
                                Response.Write("{\"status\":\"error\",\"message\":\"Invalid JSON data format: " + validateEx.Message.Replace("\"", "\\\"") + "\"}");
                                return;
                            }
                            
                            try {
                                // Write to App_Data as the durable source of truth
                                string savedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                                string lastError = "";
                                string savedPath = "";
                                var attempted = new System.Collections.Generic.List<string>();

                                foreach (string p in candidatePaths) {
                                    if (string.IsNullOrEmpty(p)) continue;
                                    try {
                                        attempted.Add(p);
                                        string dataDir = Path.GetDirectoryName(p);
                                        if (!string.IsNullOrEmpty(dataDir)) {
                                            Directory.CreateDirectory(dataDir);
                                        }

                                        string tmp = p + ".tmp";

                                        Application.Lock();
                                        try {
                                            File.WriteAllText(tmp, dataToSave, Encoding.UTF8);
                                            if (File.Exists(p)) {
                                                // Replace is atomic on same volume; keep a backup of the prior state.
                                                string backupPath = p + ".backup";
                                                File.Replace(tmp, p, backupPath);
                                            } else {
                                                File.Move(tmp, p);
                                            }

                                            // Update cache for quick reads
                                            Application["SlidesetData"] = dataToSave;
                                            Application["LastSaved"] = savedAt;
                                        } finally {
                                            try { if (File.Exists(tmp)) File.Delete(tmp); } catch { }
                                            Application.UnLock();
                                        }

                                        savedPath = p;
                                        break;
                                    } catch (Exception writeEx) {
                                        lastError = writeEx.Message;
                                    }
                                }

                                if (string.IsNullOrEmpty(savedPath)) {
                                    string attemptedJoined = string.Join(" | ", attempted.ToArray());
                                    throw new Exception((lastError ?? "No writable storage path found") + ". Attempted: " + attemptedJoined);
                                }

                                string escapedSavedPath = savedPath.Replace("\\", "\\\\").Replace("\"", "\\\"");
                                Response.Write("{\"status\":\"success\",\"message\":\"Data saved\",\"method\":\"file_json\",\"savedAt\":\"" + savedAt + "\",\"storagePath\":\"" + escapedSavedPath + "\"}");
                                
                            } catch (Exception ex) {
                                Response.StatusCode = 500;
                                string errorMessage = ex.Message.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "\\r").Replace("\n", "\\n").Replace("\t", "\\t");
                                Response.Write("{\"status\":\"error\",\"message\":\"File storage error: " + errorMessage + "\"}");
                            }
                        } else {
                            Response.Write("{\"status\":\"error\",\"message\":\"Invalid data format\"}");
                        }
                    } else {
                        Response.Write("{\"status\":\"error\",\"message\":\"No data found in request\"}");
                    }
                }
            } else {
                Response.Write("{\"status\":\"error\",\"message\":\"Unknown POST action\"}");
            }
            
        } else {
            Response.Write("{\"status\":\"error\",\"message\":\"Unsupported method\"}");
        }
        
    } catch (Exception ex) {
        Response.StatusCode = 500;
        // Properly escape JSON string
        string errorMessage = ex.Message.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "\\r").Replace("\n", "\\n").Replace("\t", "\\t");
        Response.Write("{\"status\":\"error\",\"message\":\"" + errorMessage + "\"}");
    }
%>