function sessionFunc(session) {
    var data = [];
    var a = session.split('+');
    a.pop();
    a.forEach(element => {
        var e = element.split('-');
        var obj = {};
        obj.year = e[0];
        obj.month = e[1];
        obj.date = e[2];
        obj.buoi = e[3];
        obj.number = e[4];
        data.push(obj);
    });
    return data;
}
module.exports = {

    sessionFunc: sessionFunc
}