# TikTok Live Stream Link Extractor API

This project provides an API deployed on Cloudflare Workers that extracts the live stream URL for a given TikTok user. The API allows you to query a TikTok username and retrieve the corresponding live stream URL, if available.

## Features

- Extract TikTok live stream URLs for any given TikTok username.
- Serverless deployment using Cloudflare Workers.
- Fast and scalable.

## How It Works

This API interacts with the TikTok website to extract the `room_id` for a user, then uses that ID to fetch the live stream URL (if the user is live). It provides the stream URL in a JSON format.

The API is serverless and is deployed on Cloudflare Workers for fast and cost-effective scaling.

## API Endpoint

### `GET /api/links?usernames[]=`

Fetches the live stream URL for the specified TikTok username.

- **Query Parameter**:
  - `usernames` (required): The TikTok usernames whose live stream URL you want to retrieve.
  
- **Response**:
  - On success, returns the live stream URL.
  - If the user is not live or the username is invalid, it returns an error message.

### Example Request

```
GET https://your-subdomain.workers.dev/api/links?usernames[]=ohsomefunhouse
```

### Example Response

```json
{
  "user": "ohsomefunhouse",
  "live_stream_link": "rtmp://example.com/live/streamkey"
}
```

In case the user is not live, the response might look like:

```json
{
  "error": "User is not live"
}
```

## Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/tiktok-live-stream-link-extractor-api.git
   cd tiktok-live-stream-link-extractor-api
   ```

2. **Install `wrangler`:**

   Cloudflare Workers are managed using the `wrangler` CLI. If you don't have it installed yet, install it globally via npm:

   ```bash
   npm install -g wrangler
   ```

3. **Login to Cloudflare:**

   Log in to your Cloudflare account:

   ```bash
   wrangler login
   ```

4. **Deploy the Worker:**

   After configuring the project, deploy it to Cloudflare Workers:

   ```bash
   wrangler publish
   ```

6. **Access the API:**

   After deployment, your API will be available at the URL specified in the `wrangler.toml` file (e.g., `https://your-subdomain.workers.dev/api/links?usernames[]=<username>`).

## Local Development

You can test your Cloudflare Worker locally using the `wrangler dev` command:

```bash
wrangler dev
```

This will start a local server that you can use to test your API before deploying it to the cloud.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- TikTok live stream URL extraction is done using requests to public TikTok endpoints.
- Cloudflare Workers for deploying serverless API.
