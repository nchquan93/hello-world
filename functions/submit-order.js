const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const order = data.contact;
        const marketing = data.marketing || {};
        
        // Lấy product_id từ payload gửi lên
        const product_id = data.product_id || 'N/A';

        const user_ip = event.headers['x-nf-client-connection-ip'] || 'N/A';
        const user_agent = event.headers['user-agent'] || 'N/A';

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        const { error } = await supabase.from('orders').insert({ 
            // Dữ liệu đơn hàng
            full_name: order.full_name,
            phone_number: order.phone_number,
            country: order.country,
            address_details: order.address_details,
            address_level_1: order.address_level_1,
            address_level_2: order.address_level_2,
            address_level_3: order.address_level_3,
            selected_product: order.selected_product,
            note: order.note,

            // Dữ liệu marketing
            landing_page_url: marketing.landing_page,
            user_ip: user_ip,
            user_agent: user_agent,
            utm_source: marketing.utm_source,
            utm_medium: marketing.utm_medium,
            utm_campaign: marketing.utm_campaign,
            utm_term: marketing.utm_term,
            utm_content: marketing.utm_content,

            // THÊM DỮ LIỆU MỚI
            product_id: product_id
        });

        if (error) {
            console.error('Supabase insert error:', error);
            throw new Error(error.message);
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
