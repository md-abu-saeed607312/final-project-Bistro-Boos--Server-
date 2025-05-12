const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    const paymentCollectionDB = client.db("bistroDb").collection("payment");

    app.get("/", (req, res) => {
      res.send("Hello from Bistro Boss Restaurant!");
    });

    //jwt releted api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //middlewares
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers);
      //Condition: token থাকলে তোমাকে চিনি না থাকলে চিনি না
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthor Access" });
      }

      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthor Access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollectionDB.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbiden access" });
      }
      next();
    };

    // ---------Registation User Info  (Start api)------------
    app.get("/userinfo", verifyToken, verifyAdmin, async (req, res) => {
      // আমরা চাইলে এখান থেকেও token verify করতে পারি
      const result = await userCollectionDB.find().toArray();
      res.send(result);
    });

    app.get("/userinfo/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (!email === req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      // যদি কন্ডিশন ঠিক থাকে তাহলে আমরা ডাটাবেইজে র্সাচ করবো
      const query = { email: email };
      const user = await userCollectionDB.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

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

    app.patch("/userinfo/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          //role Database থেকে পাই
          role: "admin",
        },
      };

      const result = await userCollectionDB.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/userinfo/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollectionDB.deleteOne(query);
      res.send(result);
    });

    // ---------Registation User Info  (End api)------------

    app.get("/menu", async (req, res) => {
      const result = await menuCollectionDB.find().toArray();
      res.send(result);
    });

    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollectionDB.findOne(query);
      res.send(result);
    });

    app.patch("/menu/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: item.name,
          price: item.price,
          category: item.category,
          recipe: item.recipe,
          image: item.image,
        },
      };
      const result = await menuCollectionDB.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await menuCollectionDB.insertOne(item);
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const result = reviewsCollectionDB.find();
      const resul = await result.toArray();
      res.send(resul);
    });

    app.delete("/menu/:id", async (req, res) => {
      const id = req.params.id;
      console.log("saeed", id);
      const query = { _id: new ObjectId(id) };
      const result = await menuCollectionDB.deleteOne(query);
      res.send(result);
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

    // Admin Dashboard status(Start)
    app.get("/admin-status", async (req, res) => {
      const user = await userCollectionDB.estimatedDocumentCount();
      const menu = await menuCollectionDB.estimatedDocumentCount();
      const orders = await paymentCollectionDB.estimatedDocumentCount();

      // const payment = await paymentCollectionDB.find().toArray();
      // const revenue = payment.reduce((item, price) => item + price.price,0);
      const result = await paymentCollectionDB
        .aggregate([
          {
            $group: {
              _id: null,
              totalPrice: { $sum: "$price" },
            },
          },
        ])
        .toArray();

      const totalrevenue = result.length > 0 ? result[0].totalPrice : 0;

      res.send({ user, menu, orders, totalrevenue });
    });

    // Admin Dashboard status(End)

    // Payment Srip( Start )

    app.get("/payments/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden Access" });
      }
      const result = await paymentCollectionDB.find(query).toArray();
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amounts = parseInt(price * 100);
      console.log("Taka ------------------->", amounts);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amounts,
        currency: "usd",
        // automatic_payment_methods: { enabled: true },
        payment_method_types: ["card", "link"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollectionDB.insertOne(payment);

      //carefully delete each item from the cart
      console.log("payment info", payment);
      const query = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };

      const deleteResult = await cartCollectionDB.deleteMany(query);
      res.send({ paymentResult, deleteResult });
    });

    // Payment Srip( End )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run();

app.listen(port, () => {
  console.log(`BISTRO BOSS RESTRUNT :${port}`);
});
