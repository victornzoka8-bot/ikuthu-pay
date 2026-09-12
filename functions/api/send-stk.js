export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { phone, amount, accountRef, businessShortCode, consumerKey, consumerSecret, passkey } = body;

    // 1. Get Token from Safaricom
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenRes = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` }
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) throw new Error('Token failed: ' + JSON.stringify(tokenData));

    // 2. Send STK Push
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0,14);
    const password = btoa(businessShortCode + passkey + timestamp);
    
    const stkRes = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: businessShortCode,
        PhoneNumber: phone,
        CallBackURL: "https://mydomain.com/callback",
        AccountReference: accountRef || "IkuthuPay",
        TransactionDesc: "Payment"
      })
    });

    const result = await stkRes.json();
    return new Response(JSON.stringify(result), { 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
