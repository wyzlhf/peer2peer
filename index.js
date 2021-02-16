'use strict'

//获取页面元素
var mineVideo = document.getElementById('mineVideo')
var otherVideo = document.getElementById('otherVideo')
// var startButton = document.getElementById('startButton')
var callButton = document.getElementById('callButton')
var hangupButton = document.getElementById('hangupButton')
var localStream = null
var pcOffer, pcAnswer
var offerSocketID, answerSocketID
var roomName = 'm2m'

const iceServer = {
    iceServers: [{
        'urls': 'turn:8.133.169.171:3478',
        'credential': '123456',
        'username': 'test'
    }]
};

//基础函数开始
function start() {
    console.log('client-start')
    var consraints = {video: true, audio: false}
    navigator.mediaDevices.getUserMedia(consraints).then(stream => {
        mineVideo.srcObject = stream
        localStream = stream
        // console.log('client-localStream：')
        // console.log(localStream)
    }).catch(err => {
        console.log(err.name)
    })

    // callButton.disabled = false
    // startButton.disabled = true
}

function call() {
    pcOffer=new RTCPeerConnection(iceServer)
    console.log('client-pcOffer:'+pcOffer)
    if (localStream){
        localStream.getTracks().forEach((track) => {
            pcOffer.addTrack(track, localStream);
        })
        console.log('重新打印一下localStream：')
        console.log(localStream)
    }else {
        start()
    }
    // pcOffer.addStream(localStream)
    // console.log('打印一下localStream：')
    // console.log(localStream)
    pcOffer.createOffer().then(offer=>{
        return pcOffer.setLocalDescription(offer)
    }).then(()=>{
        offerSocketID=socket.id
        console.log('client-打印一下description看看：')
        console.log(pcOffer.localDescription)
        socket.emit('pcOffer',{
            type:'video-offer',
            description:pcOffer.localDescription,
            // to:answerSocketID,
            sender:offerSocketID,
        })
    })
    pcOffer.ontrack=ev => {
        console.log('client-offer端，开始添加远端流')
        let remoteStream=ev.streams[0]
        otherVideo.srcObject=remoteStream
    }
    pcOffer.onicecandidate=({ candidate }) => {
        console.log('onicecandidate:'+pcOffer)
        socket.emit('offerICE', {
            candidate: candidate,
            // to: parterName,
            sender: offerSocketID
        });
    };
}

function hangup() {
//pass，此处逻辑未处理
}

// 基础函数结束

// socket监控开始
var socket=io().connect()
socket.emit('new user',roomName)


socket.on('pcOffer',data=>{
    //开始处理answer端业务
    // console.log('client-打印一下新的Stream')
    // console.log(localStream)
    pcAnswer=new RTCPeerConnection(iceServer)
    if (localStream){
        localStream.getTracks().forEach((track) => {
            pcAnswer.addTrack(track, localStream);
        })
        console.log('重新打印一下answer端localStream：')
        console.log(localStream)
    }else {
        start()
    }
    let desc = new RTCSessionDescription(data.description)
    console.log('client-打印一下desc看一下：')
    console.log(desc)
    pcAnswer.setRemoteDescription(desc).then(()=>{
        pcAnswer.createAnswer().then(answer=>{
            return pcAnswer.setLocalDescription(answer)
        }).then(()=>{
            answerSocketID=socket.id
            console.log('client-anwer端-生成PCAnswer，并开始发给服务端')
            socket.emit('pcAnswer',{
                type: 'video-answer',
                description: pcAnswer.localDescription,
                sender: answerSocketID,//这边知道answerSocketID么？
            })
        })
    })
    pcAnswer.ontrack=ev => {
        console.log('client-answer端，开始添加远端流')
        let remoteStream=ev.streams[0]
        otherVideo.srcObject=remoteStream
    }
    pcAnswer.onicecandidate=({ candidate }) => {
        console.log('client-answer-onicecandidate开始发出')
        socket.emit('answerICE', {
            candidate: candidate,
            // to: parterName,
            sender: answerSocketID
        });
    };
})

socket.on('pcAnswer',data=>{
    let desc = new RTCSessionDescription(data.description);
    pcOffer.setRemoteDescription(desc);
})

socket.on('offerICE',data=>{
    console.log('server-answer端收到offer端ice，并添加到本地')
    if (data.candidate) {
        var candidate = new RTCIceCandidate(data.candidate);
        //讲对方发来的协商信息保存
        pcAnswer.addIceCandidate(candidate).catch();//catch err function empty
    }
})

socket.on('answerICE',data=>{
    console.log('server-offer端收到answer端ice，并添加到本地')
    if (data.candidate) {
        var candidate = new RTCIceCandidate(data.candidate);
        //讲对方发来的协商信息保存
        pcOffer.addIceCandidate(candidate).catch();//catch err function empty
    }
})

// socket监控结束

$(function () {
    start()
    callButton.onclick=call
})