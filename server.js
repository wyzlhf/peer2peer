var express = require('express');
var app = express();
var http = require('http').createServer(app);
var favicon = require('serve-favicon');
var fs = require('fs');
let sslOptions = {
    key: fs.readFileSync('C:/privkey.key'),//里面的文件替换成你生成的私钥
    cert: fs.readFileSync('C:/cacert.pem')//里面的文件替换成你生成的证书
};
const https = require('https').createServer(sslOptions, app);
var io = require('socket.io')(https);
app.use(favicon(__dirname + '/favicon.ico')) //这是一处处理favicon的逻辑，如果没有图标，可以注释掉
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
app.get('/index.js',(req,res)=>{
    res.sendFile(__dirname+'/index.js')
})

https.listen(443, () => {
    console.log('https listening on *:443');
});
// 基本配置完成

// 开始业务配置
const maxLimitARoom=1
var peerInfo={}
var socketInfo=[]
// 业务配置结束


//常用函数和方法开始
Array.prototype.remove = function(val) {
    var index = this.indexOf(val);
    if (index > -1) {
        this.splice(index, 1);
    }
};
//常用函数和方法结束
// 开始socket监控
io.on('connection',socket=>{
    //所有监控业务都在这里面
    //开始基本业务，连接、断开
    socket.on('new user',roomName=>{
        io.in(roomName).allSockets().then(users=>{
            if (users.size<=maxLimitARoom){
                socket.join(roomName)
                socketInfo.push(socket.id)
                console.log('server-新用户加入，用户ID是：'+socket.id)
                console.log('server-socketInfo:'+socketInfo)
                console.log('server-server端开始广告另一个用户的socketID')
                socket.broadcast.emit('new user', socketInfo)
            }else {
                console.log('人数已满')
                socket.emit('full','人数已满')
            }
        })
    })

    socket.on('disconnect',()=>{
        var socketID=socket.id
        console.log('server-用户断开连接，用户ID：'+socket.id)
        socketInfo.remove(socketID)
        console.log('server-serverInfo：'+socketInfo)

        // 还需要处理删除pc的逻辑
        // if (peerInfo.has(socketID)){
        //     delete peerInfo.socketID
        // }
    })
    // 基本业务，连接、断开结束
    //开始处理连接业务
    socket.on('pcOffer',data=>{
        // type:'video-offer',
        //     description:pcOffer.localDescription,
        //     // to:answerSocketID,
        //     sender:offerSocketID,
        var answerID
        // for (var id in socketInfo){
        //     data.sender=id
        //     answerID=id
        // }
        socketInfo.forEach(socketID=>{
            socketID!==data.sender
            answerID=socketID
        })
        console.log('server-打印answerID：'+answerID)
        console.log('server-pcOffer转发出去')
        console.log('server-打印一下pcOffer的data数据：')
        console.log(data)
        socket.broadcast.emit('pcOffer',data)
    })

    socket.on('pcAnswer',data=>{
        //
        // console.log('server-打印answerID：'+answerID)
        // console.log('server-pcOffer转发出去')
        console.log('server-pcAnswer收到，并开始转发')
        console.log('server-打印一下pcAnswer的data数据：')
        console.log(data)
        socket.broadcast.emit('pcAnswer',data)
    })

    socket.on('offerICE',data=>{
        console.log('server-收到offerICE，并转发出去')
        socket.broadcast.emit('offerICE',data)
    })

    socket.on('answerICE',data=>{
        console.log('server-收到answerICE，并转发出去')
        socket.broadcast.emit('answerICE',data)
    })
    //处理连接业务结束
})
// socket监控结束