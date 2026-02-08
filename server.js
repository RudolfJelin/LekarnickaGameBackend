/*TUTORIAL CONTENT*/

const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = (require('socket.io'))(http)

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
},{
    text: "Hello! What time of the day is it right now? 2",
    time: 10, // In seconds
    answers: [
        "Morning",
        "Afternoon",
        "Evening",
        "Night"
    ],
    correctAnswer: "Evening"
}, ]

let userPointsMap = {
    /*
    The keys will be the socket IDs, and the values will be arrays.
    The first element of the array will be the Player's name,
    and the second will be the amount of points they currently have.

    <SOCKETID>: ["<PLAYERNAME>", <POINTS>]

    Example:

    dfwaogruhdslfsdljf: ["Khushraj", 0]
    */
}


io.on('connection', (socket) => {
    let attempt = ""

    console.log("A user connected!")
    socket.emit('connected')

    socket.once("name", (name) => {
        userPointsMap[socket.id] = [name, 0]
        io.emit("name", name)
    })

    socket.once("start", async () => {
        for (const question of questions) {
            await new Promise(async (resolve) => {
                const toSend = {
                    ...question
                } // Duplicate the question

                setTimeout(() => {
                    timeUpEvent.emit("timeUp", question.correctAnswer)
                    const sortedValues = Object.values(userPointsMap).sort(([, a], [, b]) => b - a)
                    const top5 = sortedValues.slice(0, 5)

                    io.emit("timeUp", top5)

                    socket.once("next", () => {
                        resolve()
                    })
                }, question.time * 1000)

                delete toSend.correctAnswer
                io.emit('question', toSend)
            })
        }

        const sortedValues = Object.values(userPointsMap).sort(([, a], [, b]) => b - a)
        io.emit("gameover", sortedValues)
        process.exit(0)
    })

    socket.on("answer", answer => {
        attempt = answer
    })

    timeUpEvent.on("timeUp", (correctAnswer) => {
        if (attempt) {
            if (attempt === correctAnswer) {
                userPointsMap[socket.id][1]++
                socket.emit("correct")
            } else {
                socket.emit("incorrect")
            }
            attempt = ""
        } else {
            socket.emit("noAnswer")
        }
    })
})




app.use(express.static('public'))

http.listen(3000, () => {
    console.log('listening on *:3000')
})


