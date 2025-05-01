require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.ADMIN_SECRET}:${process.env.SECRET_KEY}@cluster0.dblis.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const userCollectionDB = client.db("bistroDb").collection("user");
    const menuCollectionDB = client.db("bistroDb").collection("menu");
    const reviewsCollectionDB = client.db("bistroDb").collection("reviews");
    const cartCollectionDB = client.db("bistroDb").collection("carts");

    app.get("/", (req, res) => {
      res.send("Hello from Bistro Boss Restaurant!");
    });

    app.get("/menu", async (req, res) => {
      const result = await menuCollectionDB.find().toArray();
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const result = reviewsCollectionDB.find();
      const resul = await result.toArray();
      res.send(resul);
    });

    // ---------Add to carts Collections (Start)------------
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollectionDB.find(query).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollectionDB.insertOne(cartItem);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollectionDB.deleteOne(query);
      res.send(result);
    });
    // ---------Add to carts Collections (End)------------


    // ---------Registation User Info  (Start api)------------
    app.post("/userinfo", async (req, res) => {
      const userinfo = req.body;
      const query = { email: userinfo.email };
      const existinfUser = await userCollectionDB.findOne(query);
      //এক ইমেইল দিয়ে google login দুইবার করলে  তা ডাটাবেজে একবার ইনসার্ট হবে
      //you can do this many ways(1.email uniqe,2.upsert,3.simple checking)
      if (existinfUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await userCollectionDB.insertOne(userinfo);
      res.send(result);
    });


    app.get("/userinfo",async(req,res)=>{
      const result= await userCollectionDB.find().toArray()
      res.send(result)
    })
    // ---------Registation User Info  (End api)------------





    
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run();

app.listen(port, () => {
  console.log(`BISTRO BOSS RESTRUNT :${port}`);
});
