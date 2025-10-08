import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

export const handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const order = data.contact;
        const marketing = data.marketing || {};
        const product_id = data.product_id || 'N/A';

        const user_ip = event.headers['x-forwarded-for'] ? event.headers['x-forwarded-for'].split(',')[0].trim() : (event.headers['x-nf-client-connection-ip'] || 'N/A');
        const user_agent = event.headers['user-agent'] || 'N/A';

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        // Tạo một đối tượng ngày giờ hiện tại
        const now = new Date();

        // Chuẩn bị dữ liệu để ghi vào Supabase
        const supabasePayload = {
            created_at: now.toISOString(), // Gửi giờ UTC chuẩn
            full_name: order.full_name, phone_number: order.phone_number, country: order.country,
            address_details: order.address_details, address_level_1: order.address_level_1,
            address_level_2: order.address_level_2, address_level_3: order.address_level_3,
            selected_product: order.selected_product, note: order.note,
            landing_page_url: marketing.landing_page, user_ip: user_ip, user_agent: user_agent,
            utm_source: marketing.utm_source, utm_medium: marketing.utm_medium,
            utm_campaign: marketing.utm_campaign, utm_term: marketing.utm_term,
            utm_content: marketing.utm_content, product_id: product_id
        };

        const { data: insertedData, error } = await supabase
            .from('orders')
            .insert(supabasePayload)
            .select()
            .single();

        if (error) { throw new Error(`Supabase Error: ${error.message}`); }

        // Gửi bản sao đến Google Sheets
        if (process.env.GOOGLE_SCRIPT_URL && insertedData) {
            console.log('Preparing to send data to Google Sheet.');

            // Tự tính toán giờ GMT+7
            const gmt7Time = new Date(now.getTime() + 7 * 60 * 60 * 1000);
            const gmt7ISOString = gmt7Time.toISOString();

            const payloadForSheet = {
                ...insertedData,
                created_at_gmt7: gmt7ISOString // Sử dụng giờ đã tính toán
            };
            
            // Sử dụng await để chắc chắn rằng chúng ta có thể log kết quả
            try {
                console.log('Sending fetch request to Google Script URL...');
                const sheetResponse = await fetch(process.env.GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadForSheet),
                    redirect: 'follow' // Thêm dòng này để xử lý chuyển hướng của Google
                });

                // Google Script thường trả về HTML, nên chúng ta đọc text
                const responseText = await sheetResponse.text();
                console.log('Google Sheet response status:', sheetResponse.status);
                console.log('Google Sheet response body:', responseText);

                if (!sheetResponse.ok) {
                    console.error('Google Sheet returned an error status.');
                }
            } catch (e) {
                console.error("Error during fetch to Google Sheet:", e);
            }
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true })
        };

    } catch (error) {
        console.error('Error in function execution:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};
