# Unraid Deployment Instructions

This folder contains the Unraid Docker template for **Appstore Analytics**.

## 1. Install the Template

To add this app to your Unraid "Add Container" list, you need to place the `.xml` file on your Unraid Flash drive.

### Option A: Automatic Download (Recommended)
Open the terminal on your Unraid server and run:

```bash
curl -o /boot/config/plugins/dockerMan/templates-user/appstore-analytics.xml https://raw.githubusercontent.com/zmsp/appstore-playstore-analytics-pipeline/main/unraid/appstore-analytics.xml
```

### Option B: Manual Upload
Copy `appstore-analytics.xml` from this folder to your Unraid server at:
`/boot/config/plugins/dockerMan/templates-user/appstore-analytics.xml`

---

## 2. Prepare Configuration
Before starting the container, create the configuration directories and add your keys:

1. Create the folders:
   ```bash
   mkdir -p /mnt/user/appdata/appstore-analytics/config/keys
   mkdir -p /mnt/user/appdata/appstore-analytics/data
   ```
2. Place your `config.json` in the `config` folder.
3. Place your Google (`.json`) and Apple (`.p8`) key files in the `keys` folder.
4. **Fix Permissions:** The container runs as a non-root user (UID 1000). You must set ownership so the app can write its cache and password files:
   ```bash
   chown -R 1000:1000 /mnt/user/appdata/appstore-analytics/
   ```

**Example `config.json` entry:**
```json
[
  {
    "name": "My App",
    "keyFilePath": "keys/google_key.json",
    "keyFilePath_apple": "keys/apple_key.p8",
    ...
  }
]
```

---

## 3. Run the Container
1. In the Unraid WebUI, go to the **Docker** tab.
2. Click **Add Container** at the bottom.
3. Select **appstore-analytics** from the **Template** dropdown.
4. The ports and paths will be pre-filled.
5. Set a custom `JWT_SECRET` (any random string).
6. Click **Apply**.
7. Access the UI at `http://[YOUR-SERVER-IP]:3020`.
