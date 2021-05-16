const axios = require('axios');

function send(phone, content) {
    return new Promise(async(res, rej) => {
        var sms = `{
            "ApiKey": "C671FB9BF15391FA5FFC62A3AC9A34",
            "Content": "${content} ",
            "Phone": "${phone}",
            "SecretKey": "D3C47022E82732DD589C9E2AC56742",
            "IsUnicode": "0",
            "Brandname": "DKQT.SAIGON",
            "SmsType": "2"
            }`;

        // console.log(sms);
        const result1 = await axios.post('http://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/', sms, {
            headers: {
                // Overwrite Axios's automatically set Content-Type
                'Content-Type': 'application/json'
            }
        });
        console.log(result1);
        var zalo = `{
            "ApiKey": "C671FB9BF15391FA5FFC62A3AC9A34",
            "SecretKey": "D3C47022E82732DD589C9E2AC56742",
            "Phone": "${phone}",
            "OAID": "4097311281936189049",
            "TempID": "200605",
            "Params": ["${content}", "1234"]
            }`;
        const result2 = await axios.post('http://rest.esms.vn/MainService.svc/xml/SendZaloMessage_V4_post_json/', zalo, {
            headers: {
                // Overwrite Axios's automatically set Content-Type
                'Content-Type': 'application/json'
            }
        });
        console.log(result2);
        res('Tin nhắn đã gửi thành công');
    })
}
module.exports = {
    send: send
}