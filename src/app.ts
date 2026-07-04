import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import agentRoutes from './routes/agent.routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/v1/agent', agentRoutes);

// ===== Zid Config =====
const NGROK_BASE_URL = 'https://331c-78-155-64-122.ngrok-free.app';
const ZID_OAUTH_BASE = 'https://oauth.zid.sa';
const ZID_API_BASE = 'https://api.zid.sa';

const ZID_CLIENT_ID = process.env.ZID_CLIENT_ID || 'YOUR_ZID_CLIENT_ID';
const ZID_CLIENT_SECRET = process.env.ZID_CLIENT_SECRET || 'YOUR_ZID_CLIENT_SECRET';
const ZID_REDIRECT_URI = `${NGROK_BASE_URL}/oauth/callback`;

// choose the exact scopes you enabled in Zid app settings
const ZID_SCOPES = [
  'orders.read',
  'webhooks.read_write'
].join(' ');

// webhook basic auth
const ZID_WEBHOOK_USERNAME = process.env.ZID_WEBHOOK_USERNAME || 'user';
const ZID_WEBHOOK_PASSWORD = process.env.ZID_WEBHOOK_PASSWORD || 'secret';

// in-memory storage for quick testing
let zidTokens: {
  authorization?: string;
  managerToken?: string;
  refreshToken?: string;
  storeId?: string | number;
  raw?: any;
} = {};

app.get('/health', (req, res) => {
  console.log('[Health] Health check called');
  res.status(200).json({ status: 'ok' });
});

app.get('/oauth/start', async (req: Request, res: Response) => {
  try {
    console.log('\n=================== ZID OAUTH START ===================');
    const authUrl =
      `${ZID_OAUTH_BASE}/oauth/authorize` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(ZID_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(ZID_REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(ZID_SCOPES)}`;

    console.log(`[Step 2] Redirecting merchant to Zid OAuth URL: ${authUrl}`);
    console.log('=======================================================\n');

    res.redirect(authUrl);
  } catch (error: any) {
    console.error('[Fatal Error] Failed to start OAuth:', error.message);
    res.status(500).send('Failed to start OAuth flow.');
  }
});

/**
 * Step 2: OAuth Callback
 * Endpoint: GET /oauth/callback
 */
app.get('/oauth/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[Step 3] Callback hit from Zid');

    const code = req.query.code as string;
    const errorParam = req.query.error as string | undefined;

    console.log('[Debug] Query params received:', req.query);

    if (errorParam) {
      console.error(`[Error] Zid returned an OAuth error: ${errorParam}`);
      res.status(400).send(`OAuth failed: ${errorParam}`);
      return;
    }

    if (!code) {
      console.error('[Error] Callback triggered without authorization code.');
      res.status(400).send('Authorization code parameter missing.');
      return;
    }

    console.log(`[Step 4] Authorization code received: ${code}`);
    console.log('[Step 5] Exchanging code for tokens with Zid OAuth server...');

    const tokenResponse = await axios.post(
      `${ZID_OAUTH_BASE}/oauth/token`,
      {
        grant_type: 'authorization_code',
        client_id: ZID_CLIENT_ID,
        client_secret: ZID_CLIENT_SECRET,
        redirect_uri: ZID_REDIRECT_URI,
        code
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

console.log('[Step 6] Token exchange success');

console.log('\n================ TOKEN RESPONSE ================');
console.log('STATUS:', tokenResponse.status);
console.log('HEADERS:');
console.log(JSON.stringify(tokenResponse.headers, null, 2));
console.log('BODY:');
console.log(JSON.stringify(tokenResponse.data, null, 2));
console.log('================================================\n');

    const authorization = tokenResponse.data.authorization
    const managerToken = tokenResponse.data.access_token 
    const refreshToken = tokenResponse.data.refresh_token
    const storeId = process.env.ZID_STORE_ID || 'store_id_not_set';

    zidTokens = {
      authorization,
      managerToken,
      refreshToken,
      storeId,
      raw: tokenResponse.data
    };

    console.log('\n=================== TOKENS SAVED IN MEMORY ===================');
    console.log(`Authorization: ${authorization || 'NOT FOUND'}`);
    console.log(`X-Manager-Token: ${managerToken || 'NOT FOUND'}`);
    console.log(`Refresh Token: ${refreshToken || 'NOT FOUND'}`);
    console.log(`Store ID: ${storeId || 'NOT FOUND'}`);
    console.log('=============================================================\n');

    if (!authorization || !managerToken) {
      console.error('[Error] Missing authorization or manager token in token response.');
      res.status(500).send('Token exchange succeeded but expected token fields were missing.');
      return;
    }

    console.log('[Step 7] Testing tokens with Zid "me" endpoint...');
    try {
      const meResponse = await axios.get(`${ZID_API_BASE}/v1/managers/account/me`, {
        headers: {
          Authorization: authorization,
          'X-Manager-Token': managerToken,
          'Accept-Language': 'en',
          Accept: 'application/json'
        }
      });

console.log('[Step 8] /account/me success');

console.log('\n================ ACCOUNT ME RESPONSE ================');
console.log('STATUS:', meResponse.status);
console.log('HEADERS:');
console.log(JSON.stringify(meResponse.headers, null, 2));
console.log('BODY:');
console.log(JSON.stringify(meResponse.data, null, 2));
console.log('=====================================================\n');
    } catch (meError: any) {
      console.error('[Warning] Token test failed on /account/me');
      if (meError.response) {
        console.error('[Debug] /account/me error status:', meError.response.status);
        console.error('[Debug] /account/me error data:', meError.response.data);
      } else {
        console.error('[Debug] /account/me error message:', meError.message);
      }
    }

    console.log('[Step 9] Creating webhook subscription...');
    try {
      const webhookResponse = await axios.post(
        `${ZID_API_BASE}/v1/managers/webhooks`,
        {
          event: 'order.status.update',
          // target_url: `${NGROK_BASE_URL}/webhooks/zid`,
          target_url: `https://n8n.smplics.space/webhook/zid`,
          original_id: 2404,
          conditions: {},
          username: ZID_WEBHOOK_USERNAME,
          password: ZID_WEBHOOK_PASSWORD
        },
        {
          headers: {
            Authorization: `Bearer ${authorization}`,
            'X-Manager-Token': managerToken,
            'Accept-Language': 'en',
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      );

console.log('[Step 10] Webhook creation success');

console.log('\n================ WEBHOOK CREATE RESPONSE ================');
console.log('STATUS:', webhookResponse.status);
console.log('HEADERS:');
console.log(JSON.stringify(webhookResponse.headers, null, 2));
console.log('BODY:');
console.log(JSON.stringify(webhookResponse.data, null, 2));
console.log('=========================================================\n');
try {
  const webhooksResponse = await axios.get(
    `${ZID_API_BASE}/v1/managers/webhooks`,
    {
      headers: {
        Authorization: authorization,
        'X-Manager-Token': managerToken,
        'Accept-Language': 'en',
        Accept: 'application/json'
      }
    }
  );

  console.log('\n================ LIST WEBHOOKS RESPONSE ================');
  console.log('STATUS:', webhooksResponse.status);
  console.log('HEADERS:');
  console.log(JSON.stringify(webhooksResponse.headers, null, 2));
  console.log('BODY:');
  console.log(JSON.stringify(webhooksResponse.data, null, 2));
  console.log('========================================================\n');
} catch (listError: any) {
  console.error('\n================ LIST WEBHOOKS ERROR ================');

  if (listError.response) {
    console.error('STATUS:', listError.response.status);
    console.error('HEADERS:');
    console.error(JSON.stringify(listError.response.headers, null, 2));
    console.error('BODY:');
    console.error(JSON.stringify(listError.response.data, null, 2));
  } else {
    console.error('MESSAGE:', listError.message);
  }

  console.error('====================================================\n');
}
    } catch (webhookError: any) {
      console.error('[Warning] Webhook creation failed');
      if (webhookError.response) {
        console.error('[Debug] Webhook error status:', webhookError.response.status);
        console.error('[Debug] Webhook error data:', webhookError.response.data);
      } else {
        console.error('[Debug] Webhook error message:', webhookError.message);
      }
    }

    console.log('[Step 11] Redirecting merchant to success page');
    console.log('==============================================================\n');

    res.redirect('/success');
  } catch (error: any) {
    console.error('\n🔴 OAuth callback flow failed');
    if (error.response) {
      console.error('[Debug] Status:', error.response.status);
      console.error('[Debug] Data:', error.response.data);
    } else {
      console.error('[Debug] Message:', error.message);
    }
    res.status(500).send('OAuth callback handling failed.');
  }
});

/**
 * Zid Webhook Listener
 * Endpoint: POST /webhooks/zid
 */
app.post('/webhooks/zid', (req: Request, res: Response): void => {
  console.log('\n=================== ZID WEBHOOK RECEIVED ===================');
  try {
    console.log('\n=================== INCOMING ZID WEBHOOK ===================');

    const authHeader = req.headers.authorization || '';
    const expectedBasic =
      'Basic ' +
      Buffer.from(`${ZID_WEBHOOK_USERNAME}:${ZID_WEBHOOK_PASSWORD}`).toString('base64');

    console.log('[Step 1] Validating webhook Basic Auth...');
    if (authHeader !== expectedBasic) {
      console.error('[Error] Invalid webhook Basic Auth');
      res.status(401).json({ error: 'Unauthorized webhook request' });
      return;
    }

    console.log('[Step 2] Basic Auth valid');

    const payload = req.body;
    console.log('[Step 3] Full payload received:');
    console.log(JSON.stringify(payload, null, 2));

    res.status(202).json({ status: 'acknowledged' });

    const event = payload?.event;
    const order = payload?.data;

    console.log(`[Step 4] Event: ${event}`);

    if (event !== 'order.payment_status.update') {
      console.warn(`[Warning] Ignored unsupported event type: ${event}`);
      console.log('===========================================================\n');
      return;
    }

    if (!order) {
      console.error('[Error] Missing payload.data object');
      console.log('===========================================================\n');
      return;
    }

    const summary = {
      id: order.id,
      invoice_number: order.invoice_number,
      code: order.code,
      store_id: order.store_id,
      store_name: order.store_name,
      store_url: order.store_url,
      order_status_name: order.order_status?.name,
      order_status_code: order.order_status?.code,
      payment_status: order.payment_status,
      currency_code: order.currency_code,
      order_total: order.order_total,
      transaction_reference: order.transaction_reference,
      transaction_amount: order.transaction_amount,
      customer_id: order.customer?.id,
      customer_name: order.customer?.name,
      customer_email: order.customer?.email,
      customer_mobile: order.customer?.mobile,
      payment_method_name: order.payment?.method?.name,
      payment_method_code: order.payment?.method?.code,
      created_at: order.created_at,
      updated_at: order.updated_at
    };

    console.log('[Step 5] Extracted order summary:');
    console.log(JSON.stringify(summary, null, 2));

    if (Array.isArray(order.products)) {
      console.log('[Step 6] Products:');
      order.products.forEach((product: any, index: number) => {
        console.log(
          `[Item ${index + 1}] ` +
          `Product ID: ${product.id} | ` +
          `Order Product ID: ${product.order_product_id} | ` +
          `Name: ${product.name} | ` +
          `SKU: ${product.sku} | ` +
          `Qty: ${product.quantity} | ` +
          `Price: ${product.price} | ` +
          `Total: ${product.total}`
        );
      });
    } else {
      console.log('[Step 6] No products array found');
    }

    const shippingAddress = order.shipping?.address;
    if (shippingAddress) {
      console.log('[Step 7] Shipping address:');
      console.log(JSON.stringify({
        formatted_address: shippingAddress.formatted_address,
        street: shippingAddress.street,
        district: shippingAddress.district,
        city: shippingAddress.city?.name,
        country: shippingAddress.country?.name
      }, null, 2));
    }

    if (Array.isArray(order.payments)) {
      console.log('[Step 8] Payments summary:');
      order.payments.forEach((payment: any, index: number) => {
        console.log(
          `[Payment ${index + 1}] ` +
          `Name: ${payment.name} | ` +
          `Code: ${payment.code} | ` +
          `Type: ${payment.type} | ` +
          `Status: ${payment.status} | ` +
          `Amount: ${payment.amount} | ` +
          `Transaction Ref: ${payment.transaction_reference}`
        );
      });
    }

    console.log('[Step 9] Ready for your Odoo mapping / business logic');
    console.log('===========================================================\n');
  } catch (error: any) {
    console.error('[Fatal Error] Webhook processing exception encountered:');
    console.error(error.message);

    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal pipeline error processing webhook' });
    }
  }
});

/**
 * Success page
 */
app.get('/success', (req: Request, res: Response) => {
  console.log('[Success] Merchant reached success page');
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
    <div style="text-align:center;margin-top:12%;font-family:system-ui,sans-serif;">
      <div style="color:#2ecc71;font-size:64px;margin-bottom:10px;">✔</div>
      <h1 style="color:#2c3e50;margin:0 0 10px 0;">Smplics Automation Connected</h1>
      <p style="color:#7f8c8d;font-size:16px;margin:0;">Your Zid store is linked successfully. Payment status updates will be received through the webhook.</p>
    </div>
  `);
});

export default app;