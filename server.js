require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: "*" }));

io.on("connection", (socket) => {
  socket.on("add_message", async (value) => {
    const message = new Message({
      from: value.from,
      to: value.to,
      message: value.message,
    });
    message
      .save()
      .then(async () => {
        setInterval(async() => {
          const message_1 = await Message.find({
            'from.email': value.from.email,
            'to.email': value.to.email,
          });
          const message_2 = await Message.find({
            'to.email': value.from.email,
            'from.email': value.to.email,
          });
          socket.emit("get_messages", {
            message_send: message_1,
            message_receive: message_2,
          });
        }, 1000)
      })
      .catch((err) => console.log(err));
  });
});

mongoose.set("strictQuery", false);
try {
  mongoose.connect(process.env.MONGO_URI);
} catch (error) {
  console.log(error);
}

const message = new mongoose.Schema(
  {
    from: {},
    to: {},
    message: String,
  },
  { timestamps: true, collection: "messages" }
);

const Message = mongoose.model("Message", message);

app.post("/messages", async (req, res) => {
  // console.log(req.body.from.email)
  // console.log(req.body.to.email)
  const message_1 = await Message.find({
    'from.email': req.body.from.email,
    'to.email': req.body.to.email,
  });
  const message_2 = await Message.find({
    'from.email': req.body.to.email,
    'to.email': req.body.from.email,
  });
  // console.log(message_1, message_2)
  res.json({
    message_send: message_1,
    message_receive: message_2,
  });
});

app.get("/contacts/:email", async (req, res) => {
  
  const message_1 = await Message.find({
    'from.email': req.params.email
  });
  const message_2 = await Message.find({
    'to.email': req.params.email,
  });
  const data_mess = message_1.concat(message_2);
  const sort_mess_by_created = data_mess.sort((p1, p2) =>
    p1.createdAt > p2.createdAt ? 1 : p1.createdAt < p2.createdAt ? -1 : 0
  );
  const list_contact = sort_mess_by_created.reduce((contacts, contact) => {
    // console.log(contact.from.email)
    if(contact.from.email === req.params.email){
      contacts.push(contact.to)
    }else if(contact.to.email === req.params.email){
      contacts.push(contact.from)
    }
    return contacts
  }, [])
  const list_a = []
  list_contact.forEach(a => {
    if(list_a.length == 0){
      list_a.push(a)
    }
    // console.log(a)
    list_a.map(b => {
      if(b.email !== a.email){
        list_a.push(a)
      }
    })
  })
  // console.log("list: ",set_contacts)
  res.json({contact: list_a})
});



app.post("/messages", (req, res) => {
  const message = new Message(req.body);
  message.save((err) => {
    if (err) sendStatus(500);
    io.emit("message", req.body);
    res.sendStatus(200);
  });
});

const port = process.env.PORT || 4000;
httpServer.listen(port, () => console.log(`http://localhost:${port}`));
