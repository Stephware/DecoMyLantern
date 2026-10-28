# Animated Instagram/Facebook Story sharing (web-first)

BeMyParol offers owners an invitation Story and contributing friends a personalized contribution Story. It does **not** require account connections or automatically publish to Instagram/Facebook.

## Flow

1. Open **Share animated Story** (owner dashboard beside the single invitation link, or guest confirmation after adding a light).
2. See the portrait preview. Press **Generate animated MP4** to render an 8-second, 1080 × 1920, 30fps H.264 video; the Story is silent by default.
3. On compatible mobile browsers, press **Share video** to open the native OS share menu. The receiving app and whether it offers Stories depend on the device/app.
4. If the share menu does not support the file, press **Download MP4**, then upload it manually to Instagram or Facebook Stories.
5. Press **Copy invitation link**, and paste it into the social Story editor's **Link sticker**. The printed URL/CTA inside the video cannot be tapped.
6. **Save static PNG instead** is available as a lightweight fallback.

The video uses the *actual saved* parol design, color palette, pattern, current accepted light positions, friend count, and three actual growth layers per friend. Private messages, owner sessions, recovery secrets and contributor names are never included.

The film-like 8-second composition reveals the three most recent growth layers, then pulls back to show the whole parol and its sharing message. Exports intentionally cap drawn ornamental layers at the first 50 friends (150 growth layers) for predictable rendering cost; the text retains the true accepted-friend count.

## Architecture

- **React web UI**: `StoryFrame.tsx` is a reusable deterministic SVG composition; `StoryShare.tsx` provides the preview, video generation button, native Web Share file hand-off, downloads, and link copying.
- **ASP.NET API**: `StoryExportController` supports `POST /api/my/lantern/story` (owner cookie required) and `POST /api/invitations/story` (valid invitation **and** existing guest contribution required). Both require CSRF, are rate-limited, and collect only public parol fields from SQL. Owner/design data is never trusted from frontend export arguments.
- **Private Node/Remotion renderer**: `story-renderer` receives sanitized Story props over the private Docker network and renders H.264 MP4 or PNG. It caches identical exports for 24 hours (up to 32 files) and runs one render job at a time. No public ingress or social API credentials.
- **No database migration** for Stories. The existing backend stores all required light and pattern data.

## Required setup

For Compose (in the untracked root `.env`) set a **new, independent** internal authentication secret:
```shell
STORY_RENDERER_SECRET=$(openssl rand -hex 32)
```
Keep `INVITATION_ENCRYPTION_KEY` from the preceding single-link feature as-is. Then build and start:
```shell
docker compose -f compose.yaml up -d --build story-renderer backend frontend caddy
```
The rendering service is reachable only on the Compose network at `http://story-renderer:7070`, not as a public URL. The API receives `StoryRenderer__Url` and `StoryRenderer__SharedSecret` from Compose.

For local processes without Docker, install in `story-renderer` using `npm install`, set `STORY_RENDERER_SECRET`, run `npm start`, and set the API's `StoryRenderer:SharedSecret` user secret to the same value. It defaults to `http://127.0.0.1:7070`. Linux rendering requires Chromium dependencies; the dedicated Dockerfile installs them.

## Verification (required before release)

- Frontend: `npm ci && npm run typecheck && npm run lint && npm test && npm run build` from `src/frontend`.
- Backend: `dotnet test DecoMyLantern.slnx`.
- Renderer: install dependencies, start it and check `GET /health`, then generate MP4 and PNG via both authenticated routes.
- Verify visual quality for all six parol designs at 0, 1, 17 and 50 friends; upload the MP4 and PNG using iOS Safari/Instagram, Android Chrome/Instagram and Facebook Story editor.
- Check that non-contributing guests cannot export, invalid invitation tokens fail, CSRF is enforced, repeated exports are cached, media shows no sealed message text, and all controls fit on mobile.
- Confirm a manually added Instagram/Facebook **Link sticker** works with the current single invitation URL.

**Limitations:** File sharing varies by device/browser; posting Stories still requires manual confirmation. Remotion is an additional Node runtime and may be CPU-intensive at 1080p. Monitor latency, memory and disk pressure and consider a background job queue before high traffic.
