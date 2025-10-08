import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch'; // SỬ DỤNG import thay vì require

export const handler = async (event, context) => { // SỬ DỤNG export const thay vì exports.handler
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

        const { data: insertedData, error } = await supabase.from('orders').insert({ 
            full_name: order.full_name, phone_number: order.phone_number, country: order.country,
            address_details: order.address_details, address_level_1: order.address_level_1,
            address_level_2: order.address_level_2, address_level_3: order.address_level_3,
            selected_product: order.selected_product, note: order.note,
            landing_page_url: marketing.landing_page, user_ip: user_ip, user_agent: user_agent,
            utm_source: marketing.utm_source, utm_medium: marketing.utm_medium,
            utm_campaign: marketing.utm_campaign, utm_term: marketing.utm_term,
            utm_content: marketing.utm_content, product_id: product_id
        }).select().single();

        if (error) { throw new Error(error.message); }

        if (process.env.GOOGLE_SCRIPT_URL && insertedData) {
            const { data: gmt7Data, error: gmt7Error } = await supabase
                .from('orders_gmt7')
                .select('created_at_gmt7')
                .eq('id', insertedData.id)
                .single();

            const payloadForSheet = {
                ...insertedData,
                created_at_gmt7: gmt7Error ? insertedData.created_at : gmt7Data.created_at_gmt7
            };
            
            fetch(process.env.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadForSheet)
            }).catch(e => console.error("Error sending to Google Sheet:", e));
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
