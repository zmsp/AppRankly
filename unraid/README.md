# Unraid Deployment Instructions

AppRankly is available on the [Unraid Community Applications Store](https://ca.unraid.net/apps/apprankly-1bdjnw60t14ouy)!

## 1. Install the Template

### Option A: Unraid Community Applications (Recommended)
Search for **AppRankly** in the Unraid Apps tab or view the official listing on [Unraid Community Applications](https://ca.unraid.net/apps/apprankly-1bdjnw60t14ouy) and click **Install**.

### Option B: Automatic Template Download
Open terminal on your Unraid server and run:

```bash
curl -o /boot/config/plugins/dockerMan/templates-user/apprankly.xml https://raw.githubusercontent.com/zmsp/AppRankly/main/unraid/apprankly.xml
```

### Option C: Manual Upload
Copy `apprankly.xml` from this folder to your Unraid server at:
`/boot/config/plugins/dockerMan/templates-user/apprankly.xml`

---

## 2. Prepare Configuration
Before starting the container, create the configuration directories and add your keys:

1. Create the folders & copy configuration template:
   ```bash
   mkdir -p /mnt/user/appdata/AppRankly/config/keys
   mkdir -p /mnt/user/appdata/AppRankly/data
   cp example.config.json /mnt/user/appdata/AppRankly/config/config.json
   ```
2. Update `/mnt/user/appdata/AppRankly/config/config.json` with your credentials and parameters.
3. Place your Google (`.json`) and Apple (`.p8`) key files in the `/mnt/user/appdata/AppRankly/config/keys/` folder and mount it into your container.
4. **Fix Permissions:** The container runs as a non-root user (UID 1000). You must set ownership so the app can write its cache and password files:
   ```bash
   chown -R 1000:1000 /mnt/user/appdata/AppRankly/
   ```

**Example `config.json` structure:**
```json
{
  "name": "My App",
  "keyFilePath": "keys/google_key.json",
  "keyFilePath_apple": "keys/apple_key.p8"
}
```

---

## 3. Run the Container
1. In the Unraid WebUI, go to the **Docker** tab.
2. Click **Add Container** at the bottom.
3. Select **AppRankly** from the **Template** dropdown.
4. The ports and paths will be pre-filled.
5. Set a custom `JWT_SECRET` (any random string).
6. Click **Apply**.
7. Access the UI at `http://[YOUR-SERVER-IP]:3020`.
