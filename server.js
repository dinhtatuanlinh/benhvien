var http = require('http');
var fs = require('fs');

var querystring = require('query-string'); // hàm xử lý chuỗi url
var mongodb = require('mongodb');
var formidable = require('formidable'); // module này để lấy thông tin từ form
const excelToJson = require('convert-excel-to-json');

//var sms = require('./libs/sendsms');
var email = require('./libs/sendemail');
var database = require('./libs/database');
var getfiles = require('./libs/getfiles');
var sendsmszalo = require('./libs/sendsmszalo');
var sessionFunc = require('./libs/sessionfunc');
var MD5 = require('./libs/md5');

var ObjectId = require('mongodb').ObjectID;
var MongoClient = mongodb.MongoClient;
// var url = 'mongodb+srv://dinhtatuanlinh:164342816@cluster0.ktgtg.mongodb.net/phuc?retryWrites=true&w=majority';


// var clienturl = 'http://127.0.0.1:5500/phuc/';
// var clienturl = 'https://noteatext.com/portfolio/taimuihongsg/';
var clienturl = 'http://127.0.0.1:5500/newview/';

var Port = normalizePort(process.env.PORT || 1000);
var db = 'admin';
// var db = 'phuc';
var companiesCollection = 'companies';
var paticipantCollection = 'clients';
var sessionCollection = 'session';
var usersCollection = 'users';
var calendarCollection = 'calendar';
var args;
// bỏ dấu
function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    // Some system encode vietnamese combining accent as individual utf-8 characters
    // Một vài bộ encode coi các dấu mũ, dấu chữ như một kí tự riêng biệt nên thêm hai dòng này
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); // ̀ ́ ̃ ̉ ̣  huyền, sắc, ngã, hỏi, nặng
    str = str.replace(/\u02C6|\u0306|\u031B/g, ""); // ˆ ̆ ̛  Â, Ê, Ă, Ơ, Ư
    // Remove extra spaces
    // Bỏ các khoảng trắng liền nhau
    str = str.replace(/ + /g, " ");
    str = str.trim();
    // Remove punctuations
    // Bỏ dấu câu, kí tự đặc biệt
    str = str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'|\"|\&|\#|\[|\]|~|\$|_|`|-|{|}|\||\\/g, " ");
    return str;
}

var Dich_vu = http.createServer(async function(req, res) {
    var url1 = req.url.replace('/', '');
    var order = querystring.parse(url1);
    var receivedString = "";
    // console.log(order);
    // console.log(req.url); // http://domain/thamso;
    // update session for company
    if (req.url === '/updatesession' && req.method.toLowerCase() === 'post') {
        var data = {};
        var form = new formidable.IncomingForm();
        form.parse(req, async function(err, fields, file) {
            // console.log(fields)
            data.session = sessionFunc.sessionFunc(fields.session);
            // xử lý bất đồng bộ cho vòng lặp foreach
            var delay = async() => {
                for (const element of data.session) {

                    var calmonth = element.year + '-' + element.month;
                    var newdata = {};
                    var args = { month: calmonth, date: parseInt(element.date) };
                    var calendar = await database.getlist(calendarCollection, db, args);
                    // console.log(calendar)
                    // lấy các thông tin mặc định trong lịch
                    newdata.month = calendar[0].month;
                    newdata.date = calendar[0].date;
                    newdata.morning = calendar[0].morning;
                    newdata.noon = calendar[0].noon;
                    var calargs = { _id: ObjectId(calendar[0]._id) };
                    // console.log(calendar);


                    if (element.buoi === 'sang' && (parseInt(calendar[0].morning) - parseInt(calendar[0].morningnumber)) >= parseInt(element.number)) {

                        newdata.morningnumber = parseInt(calendar[0].morningnumber) + parseInt(element.number);
                        // add thêm số lượng người đăng ký khám và id của công ty vào buôi
                        newdata.noonnumber = calendar[0].noonnumber;
                        calendar[0].morningid.push(fields.companyid);
                        newdata.morningid = calendar[0].morningid;
                        newdata.noonid = calendar[0].noonid
                            // console.log(newdata);
                        await database.editARecord(calendarCollection, db, newdata, calargs);

                    } else if (element.buoi === 'chieu' && (parseInt(calendar[0].noon) - parseInt(calendar[0].noonnumber)) >= parseInt(element.number)) {

                        newdata.noonnumber = parseInt(calendar[0].noonnumber) + parseInt(element.number);
                        newdata.morningnumber = calendar[0].morningnumber;
                        calendar[0].noonid.push(fields.companyid);
                        newdata.noonid = calendar[0].noonid;
                        newdata.morningid = calendar[0].morningid
                            // console.log(newdata);
                        await database.editARecord(calendarCollection, db, newdata, calargs);
                    } else {
                        res.writeHead(301, { Location: `${clienturl}chooseSession.html?${fields.companyid}&${fields.NOP}` });
                        res.end();
                    }
                }
            }
            delay().then(async() => {
                // console.log(dataarray);
                var companyidargs = { _id: ObjectId(fields.companyid) }
                var company = await database.getlist(companiesCollection, db, companyidargs)

                data.session = sessionFunc.sessionFunc(fields.session);
                data.companyinfo = company[0].companyinfo;
                data.companyname = company[0].companyname;
                data.logoname = company[0].logoname;
                data.eventinfo = company[0].eventinfo;
                data.numberOfPeople = company[0].numberOfPeople;
                data.salerid = company[0].salerid;
                await database.editARecord(companiesCollection, db, data, companyidargs);
                // console.log(calArray);
            });

        })

        res.writeHead(301, { Location: `${clienturl}dashboard.html` });
        res.end();
        return;
    }
    // register
    if (req.url === '/calendar' && req.method.toLowerCase() === 'post') {

        var form = new formidable.IncomingForm();
        form.uploadDir = "excels/";
        form.parse(req, function(err, fields, file) {
            var path = file.calendar.path;
            var result = excelToJson({
                source: fs.readFileSync(path),
                // source: fs.readFileSync(form.uploadDir + file.paticipantlist.name),
                columnToKey: {
                    A: 'year',
                    B: 'month',
                    C: 'date',
                    D: 'morning',
                    E: 'noon',
                }
            })
            result = result.Sheet1;
            result.shift();
            // console.log(result);
            var current = new Date();
            var currentYear = current.getFullYear();
            var currentMonth = current.getMonth();
            var currentDate = current.getDate();
            var month = new Array();
            month[0] = "January";
            month[1] = "February";
            month[2] = "March";
            month[3] = "April";
            month[4] = "May";
            month[5] = "June";
            month[6] = "July";
            month[7] = "August";
            month[8] = "September";
            month[9] = "October";
            month[10] = "November";
            month[11] = "December";
            currentMonth = month[currentMonth];
            var currentnumber = Date.parse(currentMonth + ' ' + currentDate + ',' + ' ' + currentYear);
            result.forEach(async element => {
                var data = {};
                if (typeof element.year === 'number' && typeof element.month === 'number' && typeof element.date === 'number') {
                    var inputmonth = month[element.month - 1];
                    var inputtime = Date.parse(inputmonth + ' ' + element.date + ',' + ' ' + element.year);
                    if (inputtime > currentnumber) {
                        data.month = element.year + '-' + element.month;
                        data.date = element.date;
                        data.morning = element.morning;
                        data.noon = element.noon;
                        data.morningid = [];
                        data.noonid = [];
                        data.morningnumber = 0;
                        data.noonnumber = 0;
                        var args = { month: data.month, date: data.date };
                        // console.log(args);
                        var calendardata = await database.getlist(calendarCollection, db, args);
                        // console.log(calendardata);
                        if (calendardata.length !== 0) {
                            var respond = await database.editARecord(calendarCollection, db, data, args);
                            console.log('update');
                        } else {
                            await database.insertdata(calendarCollection, db, data);

                        }
                    } else {
                        console.log('upload old days');
                    }
                } else {
                    console.log('not number');
                }
            })

        });
        res.writeHead(301, { Location: `${clienturl}calendar.html` });
        res.end();
        return;
    }
    if (req.url === '/register' && req.method.toLowerCase() === 'post') {
        // console.log(req)
        //Khởi tạo form
        var form = new formidable.IncomingForm();
        form.parse(req, async function(err, fields, file) {
            var args = { username: fields.username };
            var getuser = await database.getlist(usersCollection, db, args);
            if (getuser.length > 0) {
                res.writeHead(301, { Location: `${clienturl}existense.html` });
                res.end();
            } else {
                fields.avartar = '';
                fields.accesstime = '';
                var dataresult = await database.insertdata(usersCollection, db, fields);
                res.writeHead(301, { Location: `${clienturl}success.html` });
                res.end();
            }
        });
        return;
    }
    // create superadmin
    if (order.req === 'superadmin' && order.auth === '164342816') {
        var data = {};
        data.username = 'dinhtatuanlinh';
        data.password = MD5.MD5('164342816');
        data.email = 'dinhtatuanlinh@gmail.com';
        data.phone = '0945078855';
        data.birthday = '28-12-1989';
        data.avartar = '';
        data.position = '';
        data.role = 'superadmin';
        data.accesstime = '';
        data.registertime = '';
        var dataresult = await database.insertdata(usersCollection, db, data);
        // console.log(dataresult);
        res.writeHead(301, { Location: `${clienturl}` });
        res.end();
        return;
    }

    // login
    if (req.url === '/login' && req.method.toLowerCase() === 'post') {
        var form = new formidable.IncomingForm();
        form.parse(req, async function(err, fields, file) { // fields là các trường được gửi lên, file là file được gửi lên qua form
            // console.log(fields);
            var args = fields.username;
            var getuser = await database.getlist(usersCollection, db, args);
            if (getuser[0].password === fields.password) {
                console.log('đăng nhập thành công');

            }


        });
        res.writeHead(301, { Location: `${clienturl}dashboard.html` });
        res.end();
        return;
    }
    // file excel
    // upload nguoi tham gia
    if (order.req === 'uploadpaticipantlist' && order.id !== undefined && order.id != null) {


        var form = new formidable.IncomingForm();
        form.uploadDir = "excels/";
        form.parse(req, async function(err, fields, file) {

            var path = file.paticipantlist.path;
            var result = excelToJson({
                source: fs.readFileSync(path),
                // source: fs.readFileSync(form.uploadDir + file.paticipantlist.name),
                columnToKey: {
                    A: 'stt',
                    B: 'companyId',
                    C: 'companyname',
                    D: 'eventinfo',
                    E: 'paticipantName',
                    F: 'paticipantPhone',
                    G: 'paticipantEmail',
                    H: 'sessions',
                    I: 'location'
                }
            })
            result = result.Sheet1;
            result.shift();
            result.forEach(async element => {

                delete element.stt;

                var a = element.sessions.split("-");
                element.session = {};
                element.session.year = a[0];
                element.session.month = a[1];
                element.session.date = a[2];
                element.session.buoi = a[3];
                element.paticipantPhone = '0' + element.paticipantPhone;
                element.location = '15 Trịnh Văn Cấn';
                // console.log(element);

                var insertvalue = await database.insertdata(paticipantCollection, db, element);
                // // sendemail
                var from = 'tuanlinh-aiamcorporation@gmail.com';
                var to = element.paticipantEmail;
                var subject = `Đăng ký tham gia sự kiện ${element.eventinfo}`;
                var emailcontent = `Bạn đã đăng ký thành công tham gia sự kiện ${element.eventinfo} của công ty ${element.companyname}, vào buổi ${element.session.buoi} ngày ${element.session.date}-${element.session.month}-${element.session.year}, tại 15 Trịnh Văn Cấn. Email này thay cho giấy mời. Truy cập vào link sau để sửa thông tin ${clienturl}memberform.html?paticipantinfo&${insertvalue.insertedId}`; //

                var emailresult = await email.sendemail(from, to, subject, emailcontent);
                var note = `Bạn đã đăng ký thành công tham gia sự kiện ${element.eventinfo} của công ty ${element.companyname}, vào buổi ${element.session.buoi} ngày ${element.session.date}-${element.session.month}-${element.session.year}, tại 15 Trịnh Văn Cấn`
                note = removeVietnameseTones(note);
                console.log(note)
                var smszalo = await sendsmszalo.send(element.paticipantPhone, note);
                console.log(smszalo);
            })


        });
        res.writeHead(301, { Location: `${clienturl}success.html` });
        res.end();
        return;
    }
    // edit paticipant info
    if (order.req === "editpaticipant" && order.id !== undefined && order.id != null) {
        args = { _id: ObjectId(order.id) };
        var form = new formidable.IncomingForm();
        var paticipantinfo = await database.getlist(paticipantCollection, db, args)
        var editdata = {};
        editdata.companyId = paticipantinfo[0].companyId;
        editdata.companyname = paticipantinfo[0].companyname;
        editdata.eventinfo = paticipantinfo[0].eventinfo;
        // console.log(paticipantinfo);


        form.parse(req, async function(err, fields, file) {
            var delay = async() => {
                editdata.location = '15 Trịnh Văn Cấn';
                editdata.paticipantName = fields.paticipantName;
                editdata.paticipantPhone = fields.paticipantPhone;
                editdata.paticipantEmail = fields.paticipantEmail;
                var a = fields.session.split('-');
                editdata.session = {};
                editdata.session.year = a[0];
                editdata.session.month = a[1];
                editdata.session.date = a[2];
                editdata.session.buoi = a[3];

            }
            delay().then(async() => {

                await database.editARecord(paticipantCollection, db, editdata, args)
                    // sendemail
                var from = 'tuanlinh-aiamcorporation@gmail.com';
                var to = editdata.paticipantEmail;
                var subject = `Đăng ký tham gia sự kiện ${fields.eventinfo}`;

                var emailcontent = `Bạn đã sửa thành công tham gia sự kiện ${fields.eventinfo} của công ty ${fields.companyname}, vào buổi ${editdata.session.buoi} ngày ${editdata.session.date}-${editdata.session.month}-${editdata.session.year}, tại 15 Trịnh Văn Cấn. Email này thay cho giấy mời. Truy cập vào link sau để sửa thông tin ${clienturl}customerform.html?paticipantinfo&${order.id}`;
                var emailresult = await email.sendemail(from, to, subject, emailcontent);
                var note = to.replace(".com", "");
                var smszalo = await sendsmszalo.send(editdata.paticipantPhone, note)

            })

        });
        res.writeHead(301, { Location: `${clienturl}success.html` });
        res.end();
        return;
    }
    // add paticipant

    if (req.url === '/addpaticipant' && req.method.toLowerCase() === 'post') {

        //Khởi tạo form
        var form = new formidable.IncomingForm();
        // console.log(form);
        //xử lý upload
        form.parse(req, async function(err, fields, file) { // fields là các trường được gửi lên, file là file được gửi lên qua form
            if (err) throw err;
            // console.log(fields);
            //path tmp trên server
            var data = {};

            // data.attend = [];
            var args = { _id: ObjectId(fields.companyId) };
            var companydata = await database.getlist(companiesCollection, db, args);
            companydata.session

            data.location = fields.location
            data.companyId = fields.companyId;
            data.companyname = fields.companyname;
            data.eventinfo = fields.eventinfo;
            data.paticipantName = fields.paticipantName;
            data.paticipantPhone = fields.paticipantPhone;
            data.paticipantEmail = fields.paticipantEmail;
            data.session = {};
            var a = fields.session.split('-');

            data.session.year = a[0];
            data.session.month = a[1];
            data.session.date = a[2];
            data.session.buoi = a[3];

            var insertvalue = await database.insertdata(paticipantCollection, db, data);

            // sendemail
            var from = 'tuanlinh-aiamcorporation@gmail.com';
            var to = data.paticipantEmail;
            var subject = `Đăng ký tham gia sự kiện ${fields.eventinfo}`;


            var emailcontent = `Bạn đã đăng ký thành công tham gia sự kiện ${fields.eventinfo} của công ty ${fields.companyname}, vào buổi ${data.session.buoi} ngày ${data.session.date}-${data.session.month}-${data.session.year}, tại ${data.location}. Email này thay cho giấy mời. Truy cập vào link sau để sửa thông tin ${clienturl}memberform.html?paticipantinfo&${insertvalue.insertedId}`;
            var emailresult = await email.sendemail(from, to, subject, emailcontent);
            var note = to.replace(".com", "");
            var smszalo = await sendsmszalo.send(data.paticipantPhone, note)



        });
        res.writeHead(301, { Location: `${clienturl}success.html` });
        res.end();
        return;

    }

    // edit một company
    if (order.req === 'editcompany' && order.id !== undefined && order.id != null && order.salerid !== undefined && order.salerid !== null) {
        args = { _id: ObjectId(order.id) };
        var companyinfo = await database.getlist(companiesCollection, db, args);
        if (order.salerid === companyinfo[0].salerid) {

            var form = new formidable.IncomingForm();
            //Thiết lập thư mục chứa file trên server
            form.uploadDir = "uploads/";
            //xử lý upload
            form.parse(req, async function(err, fields, file) { // fields là các trường được gửi lên, file là file được gửi lên qua form
                //path tmp trên server
                var data = {};

                data.companyinfo = fields.companyinfo;
                data.companyname = fields.companyname;
                data.eventinfo = fields.eventinfo;
                data.salerid = fields.salerid;
                // data.session = companyinfo[0].session;
                data.session = [];
                data.numberOfPeople = fields.numberOfPeople;

                data.location = fields.location;

                if (file.logo.name) {
                    data.logoname = file.logo.name;
                    var path = file.logo.path;
                    //thiết lập path mới cho file
                    var newpath = form.uploadDir + file.logo.name;
                    fs.rename(path, newpath, function(err) {
                        if (err) throw err;
                        // res.end('Upload Thanh cong!');
                    });
                    var oldpath = form.uploadDir + companyinfo[0].logoname;
                    fs.unlinkSync(oldpath);
                } else {
                    data.logoname = companyinfo[0].logoname;
                }
                // console.log(data);
                await database.editARecord(companiesCollection, db, data, args);
                // xóa session
                console.log(companyinfo[0].session);
                companyinfo[0].session.forEach(async element => {
                    // console.log(element);
                    var month = element.year + '-' + element.month;
                    var calargs = { month: month, date: parseInt(element.date) };
                    // console.log(calargs);
                    var cale = await database.getlist(calendarCollection, db, calargs);

                    console.log(cale[0]);
                    var removedata = {};
                    if (element.buoi === 'sang') {

                        removedata.morningnumber = cale[0].morningnumber - parseInt(element.number);
                        removedata.noonnumber = cale[0].noonnumber;
                        console.log(2);
                        console.log(removedata.morningnumber);

                    } else if (element.buoi === 'chieu') {
                        removedata.noonnumber = cale[0].noonnumber - parseInt(element.number);
                        removedata.morningnumber = cale[0].morningnumber;
                        console.log(cale[0].noonnumber);
                        console.log(parseInt(element.number));
                    }
                    console.log(removedata);
                    // console.log(cal.noonid);
                    removedata.month = cale[0].month;
                    removedata.date = cale[0].date;
                    removedata.morning = cale[0].morning;
                    removedata.noon = cale[0].noon;
                    var delay = async() => {
                        var i = 0
                        if (cale[0].morningid.length > 0) {
                            for (const element of cale[0].morningid) {
                                if (element === order.id) {
                                    cale[0].morningid.splice(i, 1);
                                    removedata.morningid = cale[0].morningid;
                                    break;
                                }
                                i++
                            }
                        } else {
                            removedata.morningid = cale[0].morningid;
                        }

                        var n = 0
                        if (cale[0].noonid.length > 0) {
                            for (const element of cale[0].noonid) {
                                if (element === order.id) {
                                    cale[0].noonid.splice(n, 1);
                                    removedata.noonid = cale[0].noonid;
                                    break;
                                }
                                n++
                            }
                        } else {
                            removedata.noonid = cale[0].noonid;
                        }

                    };
                    delay().then(async() => {
                        var calargs = { _id: cale[0]._id }

                        var r = await database.editARecord(calendarCollection, db, removedata, calargs);
                        console.log(removedata);
                    });

                    // console.log(removedata);

                });
                // end xóa session

                res.writeHead(301, { Location: `${clienturl}chooseSession.html?${order.id}&${data.numberOfPeople}` });
                res.end();
            });
        } else {
            res.end('bạn không có quyền sửa');
        }

        return;
    }


    // add company
    if (req.url === '/addcompany' && req.method.toLowerCase() === 'post') {
        // console.log(req)
        var comid;
        //Khởi tạo form
        var form = new formidable.IncomingForm();
        //Thiết lập thư mục chứa file trên server
        form.uploadDir = "uploads/";
        //xử lý upload
        form.parse(req, async function(err, fields, file) { // fields là các trường được gửi lên, file là file được gửi lên qua form
            //path tmp trên server
            var data = {};

            data.companyinfo = fields.companyinfo;
            data.companyname = fields.companyname;
            data.logoname = file.logo.name;
            data.eventinfo = fields.eventinfo;
            data.numberOfPeople = fields.numberOfPeople;
            data.salerid = fields.salerid;
            data.location = fields.location;
            data.session = [];
            // data.session = sessionFunc.sessionFunc(fields.session);
            // data.session = fields.session;

            if (file.logo.name) {
                var path = file.logo.path;
                //thiết lập path mới cho file
                var newpath = form.uploadDir + file.logo.name;
                fs.rename(path, newpath, function(err) {
                    if (err) throw err;
                    // res.end('Upload Thanh cong!');
                });
            }
            // console.log(data);
            var dataresult = await database.insertdata(companiesCollection, db, data);
            comid = dataresult.insertedId.toString();

            res.writeHead(301, { Location: `${clienturl}chooseSession.html?${comid}&${data.numberOfPeople}` });
            console.log('abce');
            res.end();
        });

        return;
    }



    req.on('data', (chunk) => { receivedString += chunk; }); // nhận dữ liệu từ client gửi lên
    // console.log(receivedString);
    //Nếu request là uplooad và method là post
    req.on('end', async() => {

        res.setHeader("Access-Control-Allow-Origin", '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type');
        res.setHeader('Access-Control-Allow-Credentials', true);
        // xóa 1 company record
        // console.log(order);
        if (order.req === 'delcompany' && order.id !== undefined && order.id !== null && order.salerId !== undefined && order.salerId !== null) {

            args = { _id: ObjectId(order.id) };

            var companydata = await database.getlist(companiesCollection, db, args);
            // console.log(order.salerId);
            // console.log(companydata);
            if (order.salerId === companydata[0].salerid) {
                // console.log(companydata);
                var form = new formidable.IncomingForm();
                //Thiết lập thư mục chứa file trên server
                // form.uploadDir = "uploads/";
                // var newpath = form.uploadDir + companydata[0].logoname;
                // fs.unlinkSync(newpath);
                var delay = async() => {

                    for (const element of companydata[0].session) {
                        var calArgs = { month: `${element.year + '-' + element.month}`, date: parseInt(element.date) };

                        if (element.buoi === 'sang') {
                            var newCalData = {};
                            var calData = await database.getlist(calendarCollection, db, calArgs);
                            var currentArgs = { _id: calData[0]._id };
                            newCalData.month = calData[0].month;
                            newCalData.date = calData[0].date;
                            newCalData.morning = calData[0].morning;
                            newCalData.noon = calData[0].noon;
                            newCalData.noonid = calData[0].noonid;
                            newCalData.morningnumber = calData[0].morningnumber - element.number;
                            newCalData.noonnumber = calData[0].noonnumber;

                            var i = 0
                            for (const e of calData[0].morningid) {
                                if (e === order.id) {
                                    calData[0].morningid.splice(i, 1);
                                    newCalData.morningid = calData[0].morningid;
                                    break;
                                }
                                i++;
                            }
                            console.log(newCalData, '1')
                            var a = await database.editARecord(calendarCollection, db, newCalData, currentArgs);
                            console.log(a);

                        } else {


                            var newCalData = {};
                            var calData = await database.getlist(calendarCollection, db, calArgs);
                            var currentArgs = { _id: calData[0]._id };
                            console.log(calData, '3');
                            newCalData.month = calData[0].month;
                            newCalData.date = calData[0].date;
                            newCalData.morning = calData[0].morning;
                            newCalData.noon = calData[0].noon;
                            newCalData.morningid = calData[0].morningid;
                            newCalData.noonnumber = calData[0].noonnumber - element.number;
                            newCalData.morningnumber = calData[0].morningnumber;

                            var i = 0
                            for (const e of calData[0].noonid) {
                                if (e === order.id) {
                                    calData[0].noonid.splice(i, 1);
                                    newCalData.noonid = calData[0].noonid;
                                    break;
                                }
                                i++;
                            }
                            console.log(newCalData, '2')
                            var a = await database.editARecord(calendarCollection, db, newCalData, currentArgs);
                            console.log(a);
                        };


                    }
                }

                delay().then(async() => {
                    var result1 = await database.deleteARecord(companiesCollection, db, args);

                    res.end('success');
                });




            } else {
                res.end('bạn không có quyền xóa');
            }
            return;

        }
        // check login
        if (req.url === '/cookie') {


            var logindata = receivedString.split('-');
            // 
            var args = { username: logindata[0] };

            var userdata = await database.getlist(usersCollection, db, args);
            // console.log(userdata);
            if (logindata[1] === userdata[0].password) {
                userdata[0].password = '';
                userdata = JSON.stringify(userdata);
                res.end(userdata);
            } else {
                res.end('empty');
            }
            return;
        }
        // get calendar

        if (order.req === "getCalendar" && order.month !== undefined) {
            var args = { month: order.month };
            var calendar = await database.getlist(calendarCollection, db, args);
            calendar = JSON.stringify(calendar);

            res.end(calendar);
            return;
        }
        // get paticipant info
        if (order.req === "paticipantinfo" && order.id !== undefined && order.id != null) {
            var args = { _id: ObjectId(order.id) };
            var paticipantinfo = await database.getlist(paticipantCollection, db, args);
            paticipantinfo = JSON.stringify(paticipantinfo);
            res.end(paticipantinfo);
            return;
        }
        // xóa người tham gia
        if (order.req === 'deletemember' && order.id !== undefined && order.id !== null && order.salerid !== undefined && order.salerid !== null) {
            args = { _id: ObjectId(order.id) };
            var customerdata = await database.getlist(paticipantCollection, db, args);

            var args1 = { _id: ObjectId(customerdata[0].companyId) }
            var companydata = await database.getlist(companiesCollection, db, args1);

            if (order.salerid === companydata[0].salerid) {
                console.log('ok');

                var result = await database.deleteARecord(paticipantCollection, db, args);


                res.end('success');
            } else {
                res.end('Bạn ko có quyền xóa khách hàng này');
            }
            return
        }

        // danh sách tham gia
        if (order.req === 'paticipantlist' && order.id !== undefined && order.id != null) {
            args = { companyId: order.id };
            // console.log(args);
            var companylist = await database.getlist(paticipantCollection, db, args);
            // console.log(companylist);
            companylist = JSON.stringify(companylist);
            res.end(companylist);
            return;
        }



        // lấy thông tin để đưa vào form edit
        if (order.req === 'companyinfo' && order.id !== undefined && order.id != null) {
            args = { _id: ObjectId(order.id) }; // nếu là ObjectID phải thêm var ObjectId = require('mongodb').ObjectID;
            var companylist = await database.getlist(companiesCollection, db, args);
            companylist = JSON.stringify(companylist);
            res.end(companylist);
            return;
        }
        if (req.url === '/getlist') {
            // console.log(paticipantCollection);
            var companylist = await database.getlist(paticipantCollection, db);
            // console.log(companylist);
            companylist = JSON.stringify(companylist);
            // console.log(companylist);
            res.end(companylist);
            return;
        }
        if (order.req === 'getcompany' && order.id !== undefined) {

            var args = { _id: ObjectId(order.id) };
            companylist = await database.getlist(companiesCollection, db, args);
            companylist = JSON.stringify(companylist);
            res.end(companylist);
            return;
        }
        // get company list by saler id

        if (order.req === 'getcompanylist' && order.id !== undefined && order.id != null) {
            var args = { _id: ObjectId(order.id) };
            var user = await database.getlist(usersCollection, db, args);
            var companylist;
            var comlist = new Array();

            if (user[0].role === 'saler') {
                args = { salerid: order.id };
                companylist = await database.getlist(companiesCollection, db, args);
            }
            if (user[0].role === 'admin' || user[0].role === 'superadmin' || user[0].role === 'viewer') {

                companylist = await database.getlist(companiesCollection, db);
                for (var i = 0; i < companylist.length; i++) {
                    var salerargs = { _id: ObjectId(companylist[i].saler) };
                    var salerdata = await database.getlist(usersCollection, db, salerargs);
                    companylist[i].salername = salerdata[0].name;
                    companylist[i].salerphone = salerdata[0].phone;
                    companylist[i].saleremail = salerdata[0].email;
                }

            }
            // console.log(companylist);
            companylist = JSON.stringify(companylist);
            res.end(companylist);
            return;
        }
        // get all company list
        if (req.url === '/getcompanylist') {

            var companylist = await database.getlist(companiesCollection, db);
            // console.log(companylist);
            companylist = JSON.stringify(companylist);
            res.end(companylist);
            return;
        }
        // get session
        if (order.req === 'getsession' && order.id !== undefined && order.id != null) {

            args = { companyId: order.id };
            var sessiondata = await database.getlist(sessionCollection, db, args);
            // console.log(sessiondata);
            sessiondata = JSON.stringify(sessiondata);
            res.end(sessiondata);
            return;
        }

        // lấy logo để hiển thị ngoài list
        if (order.req === 'getlogo' && order.name !== undefined && order.name != null) {
            Nhi_phan_Kq = getfiles.Doc_Nhi_phan_Media(order.name)
                // console.log('abc');
            res.setHeader("Access-Control-Allow-Origin", '*')
            res.writeHead(200, { 'Content-Type': 'image/png' });
            res.end(Nhi_phan_Kq, 'binary');
            return;
        }
        res.end('app is working');
    })


});
Dich_vu.listen(Port, console.log(`Dịch vụ Dữ liệu đang thực thi tại địa chỉ: http://localhost:${Port}`));
Dich_vu.on('error', onError);
Dich_vu.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}
/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof Port === 'string' ?
        'Pipe ' + Port :
        'Port ' + Port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    var addr = Dich_vu.address();
    var bind = typeof addr === 'string' ?
        'pipe ' + addr :
        'port ' + addr.port;
    console.log('Listening on ' + bind);
}