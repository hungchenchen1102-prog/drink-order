// CONFIGURATION
const CHANNEL_ACCESS_TOKEN = 'Glbvx4cFEDFQaP/G0BtKlHWDDe6oaseqocTmkBbicpwz2Yp+JFYYzBnrcDFeN/6IECig5U220CSWqSfKnqQ+GslbvSB9947hIopdaerFQCm/NJgI9rHvBiG1B3rHdt/QvceVNU1JbzR3nIo0D0az8gdB04t89/1O/w1cDnyilFU='; // Replace with your token
const SPREADSHEET_ID = '1BV9Wdol2gwJpZsPDcRINcOITxYMuAiz12ptWbtLKwI0'; // Replace with your Spreadsheet ID
// You can also use PropertiesService for better security if preferred.

function doPost(e) {
  // Handle CORS for preflight request if necessary (though GAS structure makes this hard, we handle logic)
  
  let json;
  try {
    json = JSON.parse(e.postData.contents);
  } catch (err) {
    // If parsing fails, it might be a simple POST without body or different content type
    json = {};
  }

  // Check if it's a LINE Webhook event
  if (json.events) {
    const events = json.events;
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        handleMessage(event);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
  } 
  
  // Otherwise, handle as API call (e.g. saveOrder)
  // We can pass 'action' in query parameter even for POST, or inside the body.
  // Letting the body determine the action is also fine if we structure it.
  
  if (json.action === 'saveOrder') {
    return saveOrder(json.data);
  }

  return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Unknown action'})).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getShopList') {
    const shops = getShopList();
    return ContentService.createTextOutput(JSON.stringify(shops)).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'getMenu') {
    const shop = e.parameter.shop;
    const menu = getMenu(shop);
    return ContentService.createTextOutput(JSON.stringify(menu)).setMimeType(ContentService.MimeType.JSON);
  }

  // Default: Serve the HTML (Legacy support or if user still visits GAS URL)
  // Capture the 'shop' parameter from the URL query string
  const shop = e.parameter.shop || '';
  
  const template = HtmlService.createTemplateFromFile('index');
  // Pass variables to the template
  template.initialShop = shop;
  
  return template.evaluate()
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL) // Crucial for LIFF
      .setTitle('Drink Order');
}

function handleMessage(event) {
  const userId = event.source.userId;
  const userMessage = event.message.text.trim();
  const replyToken = event.replyToken;

  if (userMessage === '點餐') {
    replyShopSelection(replyToken);
  } else if (userMessage === '歷史紀錄') {
    const lastOrder = getLastOrder(userId);
    if (lastOrder) {
      replyText(replyToken, `上次點餐紀錄:\n店家: ${lastOrder.shop}\n品項: ${lastOrder.item}\n規格: ${lastOrder.size}, ${lastOrder.sugar}, ${lastOrder.ice}\n金額: $${lastOrder.price}`);
    } else {
      replyText(replyToken, '您還沒有點餐紀錄喔！');
    }
  }
}

function replyShopSelection(replyToken) {
  // Fetch distinct shops from Menu or hardcode if preferred. 
  // Here we assume dynamic fetching from 'Menu' sheet.
  const shops = getShopList();
  
  const bubbles = shops.map(shop => ({
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": shop,
          "weight": "bold",
          "size": "xl"
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "button",
          "action": {
            "type": "uri",
            "label": "去點餐",
            "uri": `https://liff.line.me/2008582471-8eAzmDnL?shop=${encodeURIComponent(shop)}` // Replace YOUR_LIFF_ID
          }
        }
      ]
    }
  }));

  const payload = {
    replyToken: replyToken,
    messages: [{
      "type": "flex",
      "altText": "請選擇飲料店",
      "contents": {
        "type": "carousel",
        "contents": bubbles
      }
    }]
  };
  
  callLineApi('message/reply', payload);
}

function replyText(replyToken, text) {
  callLineApi('message/reply', {
    replyToken: replyToken,
    messages: [{ type: 'text', text: text }]
  });
}

function callLineApi(endpoint, payload) {
  const url = `https://api.line.me/v2/bot/${endpoint}`;
  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
    },
    payload: JSON.stringify(payload)
  };
  UrlFetchApp.fetch(url, options);
}

// --- Spreadsheet Operations ---

function getSpreadsheet() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function getShopList() {
  const sheet = getSpreadsheet().getSheetByName('Menu');
  if (!sheet) return ['Default Shop'];
  const data = sheet.getDataRange().getValues();
  // Assume Row 1 is header, Col 0 is Shop Name
  const shops = new Set();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) shops.add(data[i][0]);
  }
  return Array.from(shops);
}

function getMenu(shopName) {
  const sheet = getSpreadsheet().getSheetByName('Menu');
  const data = sheet.getDataRange().getValues();
  const menu = []; // { item, priceM, priceL }
  
  // Headers: Shop, Item, PriceM, PriceL
  // Column indexes: 0=Shop, 1=Item, 2=PriceM, 3=PriceL
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === shopName) {
      menu.push({
        item: data[i][1],
        priceM: data[i][2], // M杯價格，如果是 "-" 表示沒有M杯
        priceL: data[i][3]  // L杯價格，如果是 "-" 表示沒有L杯
      });
    }
  }
  return menu;
}

function saveOrder(order) {
  const sheet = getSpreadsheet().getSheetByName('Orders');
  // Order: { userId, userName, shop, items: [{name, size, sugar, ice, price}] }
  const timestamp = new Date();
  
  // Create user info if needed, or just log based on backend user ID if passed, 
  // but LIFF can pass profile info.
  // Columns: Timestamp, UserId, UserName, Shop, Item, Size, Sugar, Ice, Price
  
  order.items.forEach(item => {
    sheet.appendRow([
      timestamp,
      order.userId,
      order.userName,
      order.shop,
      item.name,
      item.size,
      item.sugar,
      item.ice,
      item.price
    ]);
  });
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
}

function getLastOrder(userId) {
  const sheet = getSpreadsheet().getSheetByName('Orders');
  const data = sheet.getDataRange().getValues();
  // Iterate backwards to find last
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === userId) {
      return {
        shop: data[i][3],
        item: data[i][4],
        size: data[i][5],
        sugar: data[i][6],
        ice: data[i][7],
        price: data[i][8]
      };
    }
  }
  return null;
}

