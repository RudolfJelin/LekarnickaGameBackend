/*TUTORIAL CONTENT*/

const socket = io()

let loader = document.createElement("div")
loader.classList.add("loader")

socket.on('connected', async _ => {
    const name = await swal("Your name:", {
        content: "input",
        button: "Join",
        closeOnClickOutside: false,
        closeOnEsc: false
    })
    socket.emit("name", name)
    swal({
        title: "Waiting for host",
        buttons: false,
        content: loader,
        closeOnClickOutside: false,
        closeOnEsc: false
    })
})
