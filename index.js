const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const jwt = require('jsonwebtoken');
// middleware


app.use(cors());
app.use(express.json());


// ::::::::: mongo start :::::::

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.imav3gf.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


   
    const workcollection = client.db('people_pulseDB').collection('worksheet');
    const reviewscollection = client.db('people_pulseDB').collection('reviews');
    const contactinfocollection = client.db('people_pulseDB').collection('contactinfo');
    // user infocollections
    const usercollection = client.db('people_pulseDB').collection('users');
    // payment
    const paymentCollection = client.db('people_pulseDB').collection('payments');
    const paymentHistoryCollection = client.db('people_pulseDB').collection('paymentshistory');


    // :::JWT :::::

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      console.log('Generated Token:', token);
      res.send({ token });
    })



      // middlewares 
      const verifyToken = (req, res, next) => {
        console.log('inside verify token', req.headers.authorization);
        if (!req.headers.authorization) {
          return res.status(401).send({ message: 'unauthorized access' });
        }
        const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
          if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
          }
          req.decoded = decoded;
          next();
        })
      }
  
      // use verify admin after verifyToken
      const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email };
        const user = await usercollection.findOne(query);
        const isAdmin = user?.role === 'admin';
        if (!isAdmin) {
          return res.status(403).send({ message: 'forbidden access' });
        }
        next();
      }

      // use verify hr after verifyToken
      const verifyHr = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email };
        const user = await usercollection.findOne(query);
        const isHr = user?.role === 'hr';
        if (!isHr) {
          return res.status(403).send({ message: 'forbidden access' });
        }
        next();
      }

    // :::JWT :::::


    // dashboard ::: admin   ::::
    // user related api 



    // add users
    app.post('/users',async(req,res)=>{
      const user = req.body;

      // check email uniuqe

      const query = {email: user.email}
      const existingUser = await usercollection.findOne(query);
      if(existingUser){
        return res.send({message: 'alredy exist' , insertedId: null})
      }


      const result = await usercollection.insertOne(user);
      res.send(result);
    })

    // get user
    app.get('/users',verifyToken,async(req,res)=>{
      console.log(req.headers);

      const result = await usercollection.find().toArray();
      res.send(result);
    })

   

    // Get user by ID
app.get('/users/:id', async (req, res) => {
  const userId = req.params.id; // Extract the user ID from the request URL

  try {
    const user = await usercollection.findOne({ _id: userId }); // Find the user with the specified ID
    if (!user) {
      res.status(404).send({ message: 'User not found' }); // Return an error if the user doesn't exist
      return;
    }

    res.send(user); // Send the user data if found
  } catch (error) {
    console.error(error); // Handle any errors
    res.status(500).send({ message: 'Internal server error' });
  }
});


    //get user by admin  email

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await usercollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })


    //get user by HR  email

    app.get('/users/hr/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await usercollection.findOne(query);
      let hr = false;
      if (user) {
        hr = user?.role === 'hr';
      }
      res.send({ hr });
    })


    //get user by employee  email

    app.get('/users/employee/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await usercollection.findOne(query);
      let employee = false;
      if (user) {
        employee = user?.role === 'employee';
      }
      res.send({ employee });
    })



   //delete users by id
   app.delete('/users/:id',verifyToken, verifyAdmin, async (req, res) => {

    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await usercollection.deleteOne(query)
    res.send(result)

  })


  // patch
  app.patch('/users/admin/:id',verifyToken, verifyAdmin, async (req, res) => {

    const id = req.params.id;
    const filter = { _id: new ObjectId(id) }

    const updatedDoc= {
      $set:{
        role:'hr'

      }
    }
    const result = await usercollection.updateOne(filter,updatedDoc)
    res.send(result)

  })


  app.patch('/users/hr/:id',verifyToken, verifyHr, async (req, res) => {

    const id = req.params.id;
    const filter = { _id: new ObjectId(id) }

    const updatedDoc= {
      $set:{
        role:'employee',
        isVerfied:true

      }
    }
    const result = await usercollection.updateOne(filter,updatedDoc)
    res.send(result)

  })




    //get all reviws

    app.get('/reviews', async (req, res) => {
      const result = await reviewscollection.find().toArray();
      res.send(result);
    })

    // post contact info
    app.post('/contact-us', async (req, res) => {

      const contactinfo = req.body;
      console.log(contactinfo);
      const result = await contactinfocollection.insertOne(contactinfo);
      res.send(result);

    })


    // :::user Dashboard::::


    //carts collection create

    app.post('/worksheet', async (req, res) => {

      const workItems = req.body;
      console.log(workItems);
      const result = await workcollection.insertOne(workItems);
      res.send(result);

    })

    // get specifi user data

    app.get('/worksheet', async (req, res) => {

      const email = req.query.email;
      const query = { email: email };

      const result = await workcollection.find(query).toArray();
      res.send(result)

    })

    //delete item
    app.delete('/worksheet/:id', async (req, res) => {

      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await workcollection.deleteOne(query)
      res.send(result)

    })



    // ::::add payment history in database::::

    app.post('/paymenthistory', async (req, res) => {

      const payments = req.body;
      console.log(payments);
      const result = await paymentHistoryCollection.insertOne(payments);
      res.send(result);

    })

    // get specifi user data

    app.get('/paymenthistory', async (req, res) => {

      const email = req.query.email;
      const query = { email: email };

      const result = await paymentHistoryCollection.find(query).toArray();
      res.send(result)

    })


 // payment intent::::::



 app.post('/create-payment-intent', async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price * 100);
  console.log(amount, 'amount inside the intent')

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types: ['card']
  });

  res.send({
    clientSecret: paymentIntent.client_secret
  })
});


app.get('/payments/:email', verifyToken, async (req, res) => {
  const query = { email: req.params.email }
  if (req.params.email !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  const result = await paymentCollection.find(query).toArray();
  res.send(result);
})


app.post('/payments', async (req, res) => {
  const payment = req.body;
  const paymentResult = await paymentCollection.insertOne(payment);

  //  carefully delete each item from the cart
  console.log('payment info', payment);
  const query = {
    _id: {
      $in: payment.cartIds.map(id => new ObjectId(id))
    }
  };

  const deleteResult = await cartcollection.deleteMany(query);

  res.send({ paymentResult, deleteResult });
})



// ::::::::::://
    // stats or analytics
    app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
      const users = await usercollection.estimatedDocumentCount();
      const menuItems = await menucollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();

      // this is not the best way
      // const payments = await paymentCollection.find().toArray();
      // const revenue = payments.reduce((total, payment) => total + payment.price, 0);

      const result = await paymentCollection.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: '$price'
            }
          }
        }
      ]).toArray();

      const revenue = result.length > 0 ? result[0].totalRevenue : 0;

      res.send({
        users,
        menuItems,
        orders,
        revenue
      })
    })


    // order status
    /**
     * ----------------------------
     *    NON-Efficient Way
     * ------------------------------
     * 1. load all the payments
     * 2. for every menuItemIds (which is an array), go find the item from menu collection
     * 3. for every item in the menu collection that you found from a payment entry (document)
    */

    // using aggregate pipeline
    app.get('/order-stats', verifyToken, verifyAdmin, async(req, res) =>{
      const result = await paymentCollection.aggregate([
        {
          $unwind: '$menuItemIds'
        },
        {
          $lookup: {
            from: 'menu',
            localField: 'menuItemIds',
            foreignField: '_id',
            as: 'menuItems'
          }
        },
        {
          $unwind: '$menuItems'
        },
        {
          $group: {
            _id: '$menuItems.category',
            quantity:{ $sum: 1 },
            revenue: { $sum: '$menuItems.price'} 
          }
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            quantity: '$quantity',
            revenue: '$revenue'
          }
        }
      ]).toArray();

      res.send(result);

    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//:::::::::: mongo end   ::::::::
app.get('/', (req, res) => {
  res.send('people-pulse server running ')
})

app.listen(port, () => {
  console.log(`running on port ${port}`);
})