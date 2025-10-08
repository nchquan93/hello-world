// Import Supabase SDK
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
    // Chỉ cho phép phương thức POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const order = data.contact;

        // Kết nối đến Supabase
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        // Chèn dữ liệu vào bảng 'orders'
        const { error } = await supabase.from('orders').insert({ 
            full_name: order.full_name,
            phone_number: order.phone_number,
            country: order.country,
            address_details: order.address_details,
            address_level_1: order.address_level_1,
            address_level_2: order.address_level_2,
            address_level_3: order.address_level_3,
            selected_product: order.selected_product,
            note: order.note
        });

        if (error) {
            throw error;
        }

        // Trả về phản hồi thành công
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};
