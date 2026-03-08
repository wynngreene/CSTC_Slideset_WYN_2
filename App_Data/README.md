# Slideset Data Storage

This directory contains the persistent data files for the SMT & Cleanroom Slideset application.

## Files:
- `slideset-data.json` - Main data file containing all slideshow configuration and data
- `slideset-data.json.backup` - Automatic backup of previous data (created on each save)
- `web.config` - Security configuration to prevent direct web access

## Data Structure:
The JSON file contains:
- `settings` - Slide durations and display configuration
- `statuses` - Production area toggle states (shared across all users)
- `plotData` - Absorption chart data points
- `commits` - Production commits table
- `oli` - One Lean Idea tracking data
- `notes` - Announcements and rich text content

## Multi-User Behavior:
- All users share the same data file
- Changes are immediately visible to all users
- Data persists across server restarts and IIS recycles
- Automatic backup prevents data loss

## Permissions:
- Web access denied via web.config
- Only ASP.NET application can read/write files
- Backup files created automatically on each save operation
