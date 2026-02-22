# Smart Privacy

A Firefox extension for **smart private browsing**.  
It automatically removes cookies and site data for any site not on your approve list, and asks you once when you visit a site repeatedly or enter a password.

---

## Features

| Feature | Description |
|---------|-------------|
| **Auto-cleanup** | Cookies, localStorage, IndexedDB, Cache and Service Workers are cleared when you leave a site that is not on your approve list. |
| **Approve list** | Per-domain approval managed from the popup or the options page. |
| **Repeat-visit prompt** | After visiting a new site *N* times (default: 3), you are asked once whether to save cookies. |
| **Password prompt** | If you type into a password field on a site you haven't decided about, you are prompted once. |
| **Ask once** | Once you have been asked (regardless of your choice), the prompt is never shown again for that domain. |

---

## Installation (Developer Mode)

1. Open Firefox and navigate to `about:debugging`.
2. Click **This Firefox** → **Load Temporary Add-on…**.
3. Select the `manifest.json` file from this repository.

---

## Usage

### Popup (toolbar icon)
Click the 🔒 icon in the toolbar to see the status of the current site and quickly approve or deny it.

### Options page
Open the extension options (right-click the toolbar icon → **Manage Extension** → **Preferences**, or click *Manage approve list* in the popup) to:

- View and remove approved / denied domains.
- Manually add a domain to the approve or deny list.
- Change the visit-count threshold before prompting.

### Notification bar
When you visit a site enough times or enter a password, a bar appears at the top of the page:

```
🔒 Smart Privacy: You have visited example.com multiple times. Do you want to save cookies for this site?
                                              [ Approve ]  [ Deny ]  [ ✕ ]
```

- **Approve** – adds the domain to the approve list; cookies are kept.
- **Deny** – adds the domain to the deny list; cookies are cleared immediately and on every future visit.
- **✕** – dismisses the bar; cookies will still be cleared when you leave, but you will not be asked again.

---

## File structure

```
manifest.json       Extension manifest (Manifest V2)
background.js       Background script – cookie management, visit tracking
content.js          Content script – password detection, notification bar
content.css         Styles for the notification bar
popup/
  popup.html        Browser-action popup
  popup.js
  popup.css
options/
  options.html      Full settings page
  options.js
  options.css
icons/
  icon.svg          Extension icon
```

---

## Privacy

All data (approve list, visit counts, settings) is stored locally using `browser.storage.local` and never leaves your browser.
