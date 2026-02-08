/*TUTORIAL CONTENT*/

const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

const events = require('events')
const timeUpEvent = new events.EventEmitter()

const questions = [{
    text: "Hello! What time of the day is it right now?",
    time: 10, // In seconds
    answers: [
        "Morning",
        "Afternoon",
        "Evening",
        "Night"
    ],
    correctAnswer: "Afternoon"
}, ]


io.on('connection', (socket) => {
    console.log("A user connected!")
    socket.emit('connected')
})

// app.use(express.static('public'))

http.listen(3000, () => {
    console.log('listening on *:3000')
})
