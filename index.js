import express from "express";
import User from "./Models/User.js"; // Adjust the path based on your directory structure
import bcrypt from "bcrypt";
import crypto from "crypto"; // Import the 'crypto' module
import jwt from "jsonwebtoken"; // Import the jsonwebtoken library
import nodemailer from "nodemailer";
const app = express();
const port = process.env.PORT || 8000; // Use process.env.PORT for flexibility
import cors from "cors";
const SECRET = process.env.SECRET || "topsecret";
import cookieParser from "cookie-parser";
import multer from "multer";
import bucket from "./Bucket/Firebase.js";
import fs from "fs";
import path from "path";
import  productmodel  from "./Models/User.js";

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(cors({origin: true, credentials: true}));

const storage = multer.diskStorage({
  destination: "/tmp",
  filename: function (req, file, cb) {
    console.log("mul-file: ", file);
    cb(null, `${new Date().getTime()}-${file.originalname}`);
  },
});
const upload = multer({ storage });
app.use(express.json());
app.get("/", (req, res) => {
  res.send("List it Application ");
});

app.post("/listerregister", async (req, res) => {
  try {
    const { firstname, lastname, email, phone ,postal,address,city,state, password } = req.body;

    // Check if user with the given email already exists
    const existingCustomer = await listers.findOne({ email });

    if (existingCustomer) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Create a new user
    const newCustomer = new listers({
      firstname,
      lastname,
      email,
      phone,
      postal,
      address,
      city,
      state,
      password,
    });

    // Save the user to the database
    await newCustomer.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/listerlogin", async (req, res) => {
  try {
    let body = req.body;
    body.email = body.email.toLowerCase();

    if (!body.email || !body.password) {
      res.status(400).send(`required fields missing, request example: ...`);
      return;
    }

    // check if user exists
    const data = await listers.findOne(
      { email: body.email },
      "username email password"
    );

    if (data && body.password === data.password) {
      // user found
      console.log("User Successfully Logged In !");
      console.log("data: ", data);

      const token = jwt.sign(
        {
          _id: data._id,
          email: data.email,
          iat: Math.floor(Date.now() / 1000) - 30,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        },
        SECRET
      );

      console.log("token: ", token);

      res.cookie("Token", token, {
        maxAge: 86_400_000,
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });

      res.send({
        message: "login successful",
        profile: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          age: data.age,
          _id: data._id,
        },
      });

      return;
    } else {
      // user not found
      console.log("user not found");
      res.status(401).send({ message: "Incorrect email or password" });
    }
  } catch (error) {
    console.log("error: ", error);
    res.status(500).send({ message: "login failed, please try later" });
  }
});
app.post("/listerlogout", async (req, res) => {
  try {
    let body = req.body;
    body.email = body.email.toLowerCase();



    // check if user exists
    const data = await listers.findOne(
      { email: body.email },
      "username email password"
    );

    if (data && body.password === data.password) {
      // user found
      console.log("User Successfully Logged In !");
      console.log("data: ", data);

      const token = jwt.sign(
        {
          _id: data._id,
          email: data.email,
          iat: 0,
          exp: 0,
        },
        SECRET
      );

      console.log("token: ", token);

      res.cookie("Token", token, {
        maxAge: 0,
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });
 
      res.send({
        message: "login successful",
        profile: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          age: data.age,
          _id: data._id,
        },
      });

      return;
    } else {
      // user not found
      console.log("user not found");
      res.status(401).send({ message: "Incorrect email or password" });
    }
  } catch (error) {
    console.log("error: ", error);
    res.status(500).send({ message: "login failed, please try later" });
  }
});


app.use("/api/v1", (req, res, next) => {
  console.log("req.cookies: ", req.cookies.Token);

  if (!req?.cookies?.Token) {
    res.status(401).send({
      message: "include http-only credentials with every request",
    });
    return;
  }

  jwt.verify(req.cookies.Token, SECRET, function (err, decodedData) {
    if (!err) {
      console.log("decodedData: ", decodedData);

      const nowDate = new Date().getTime() / 1000;

      if (decodedData.exp < nowDate) {
        res.status(401);
        res.cookie("Token", "", {
          maxAge: 1,
          httpOnly: true,
          sameSite: "none",
          secure: true,
        });
        res.send({ message: "token expired" });
      } else {
        console.log("token approved");

        req.body.token = decodedData;
        next();
      }
    } else {
      res.status(401).send("invalid token");
    }
  });
});

app.get("/api/v1/listerprofile", (req, res) => {
  const _id = req.body.token._id;
  const getData = async () => {
    try {
      const user = await listers.findOne(
        { _id: _id },
        "email password firstname lastname phone _id packagename"
      ).exec();
      if (!user) {
        res.status(404).send({});
        return;
      } else {
        res.set({
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          "Surrogate-Control": "no-store",
        });
        res.status(200).send(user);
      }
    } catch (error) {
      console.log("error: ", error);
      res.status(500).send({
        message: "something went wrong on server",
      });
    }
  };
  getData();
});

app.get("/userdisplay", async (req, res) => {
  try {
    const result1 = await listers.find().exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all listers successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.delete("/deletelisteruser/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const deletedData = await listers.deleteOne({ _id: id });

    if (deletedData.deletedCount !== 0) {
      res.send({
        message: "Lister profile has been deleted successfully",
      });
    } else {
      res.status(404).send({
        message: "No mentor found with this id: " + id,
      });
    }
    console.log("id",id);
  } catch (err) {
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.post("/addlist", upload.array('images', 6), (req, res) => {
  try {
    const body = req.body;


    console.log("req.body: ", req.body);
    console.log("req.files: ", req.files);

    // Iterate over the uploaded files
    const uploadedFiles = req.files.map(file => {
      console.log("uploaded file name: ", file.originalname);
      console.log("file type: ", file.mimetype);
      console.log("file name in server folders: ", file.filename);
      console.log("file path in server folders: ", file.path);

      return new Promise((resolve, reject) => {
        bucket.upload(
          file.path,
          {
            destination: `tweetPictures/${file.filename}`, 
          },
          function (err, cloudFile) {
            if (!err) {
              cloudFile
                .getSignedUrl({
                  action: "read",
                  expires: "03-09-2999",
                })
                .then((urlData) => {
                  console.log("public downloadable url: ", urlData[0]);
                  // Remove the file from the server after uploading to the cloud
                  fs.unlinkSync(file.path);
                  resolve(urlData[0]);
                })
                .catch(reject);
            } else {
              console.log("err: ", err);
              reject(err);
            }
          }
        );
      });
    });

    Promise.all(uploadedFiles)
      .then(imageUrls => {
        let addProduct = new productmodel({

          productname: body.productname,
          category: body.category,
          subcategory: body.subcategory,
          gender: body.gender,
          type : body.type,
          condition: body.condition,
          
          propertystate: body.propertystate,
          areaunit: body.areaunit,
          areasize : body.areasize,
          career: body.career,
          position: body.position,
          whatsapp: body.whatsapp,
          mobile : body.mobile,
          location: body.location,
          listername: body.listername,
          listerid: body.listerid,
          description: body.description,
          price: body.price,
         
          imageUrl1: imageUrls[0], // Save the first image URL
          imageUrl2: imageUrls[1], // Save the second image URL
          imageUrl3: imageUrls[2], // Save the third image URL
          imageUrl4: imageUrls[3], // Save the fourth image URL
          imageUrl5: imageUrls[4], // Save the fifth image URL
          imageUrl6: imageUrls[5],

          // ... Other fields
        });

        addProduct.save().then(() => {
          res.send({
            message: "Product added successfully",
            data: addProduct,
          });
        });
      })
      .catch((error) => {
        console.error("Error uploading files:", error);
        res.status(500).send({
          message: "Server error",
        });
      });
  } catch (error) {
    console.log("error: ", error);
    res.status(500).send({
      message: "Server error",
    });
  }
});

// display list products
app.get("/listdisplay", async (req, res) => {
  try {
    const result1 = await productmodel.find().exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/listdisplaysubcategories/:name", async (req, res) => {
  const category = req.params.name;
console.log("cats",category);
  try {
    const result1 = await productmodel.find({subcategory: category, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/listdisplaytrueactive", async (req, res) => {
  try {
    const result1 = await productmodel.find({isApproved: true , Deactive: false}).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});

app.get("/listdisplayfalse", async (req, res) => {
  try {
    const result1 = await productmodel.find({isApproved: false}).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all disapproved product successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/listdisplayuser/:name", async (req, res) => {
  const listernames = req.params.name;
  console.log('listr', listernames)
  try {
    const result1 = await productmodel.find({listername: listernames}).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all lister product successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/listdisplayuserid/:id", async (req, res) => {
  const listerid = req.params.id;
  console.log('listr', listerid)
  try {
    const result1 = await productmodel.find({listerid: listerid}).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all lister product successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});

//list main page listing headings

app.get("/listhotproduct", async (req, res) => {

  try {
    const result1 = await productmodel.find({topSeller:true, Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/listfashionmain", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Fashion & Appreal", bestSeller: true, Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/listpropertymain", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Property", bestSeller: true, Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/listjobsmain", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Jobs", bestSeller: true, Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/listservicemain", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Services", bestSeller: true, Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/listfurnituremain", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Furniture", bestSeller: true, Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/listhealthmain", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Health", bestSeller: true, Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/listeventsmain", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Event Planner", bestSeller: true, Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/listbeautymain", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Beauty", bestSeller: true, Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});

//list category wise lists
app.get("/fashionproducts", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Fashion & Appreal", Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/propertyproducts", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Property", Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/jobproducts", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Jobs", Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/servicesproducts", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Services", Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/furnitureproducts", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Furniture", Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/healthproducts", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Health", Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/eventproducts", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Event Planner", Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    // console.log(result);
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/beautyproducts", async (req, res) => {

  try {
    const result1 = await productmodel.find({ category: "Beauty", Deactive: false, isApproved: true }).exec(); // Using .exec() to execute the query
    res.send({
      message: "Got all productmodel successfully",
      data: result1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Server error",
    });
  }
});
app.get("/singlelist/:id", async (req,res) => {     //chane name into id

  const productId = req.params.id;
  console.log('id',productId);
  const product = await productmodel.findOne({_id:productId});

  res.send({message: "product found", Product : product})


});
app.get("/singleuser/:id", async (req,res) => {     //chane name into id

  const productId = req.params.id;
  console.log('id',productId);
  const product = await listers.findOne({_id:productId});

  res.send({message: "user found", Product : product})


});
app.get("/activatelisting/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const FindData = await productmodel.findById({ _id: id });

    if (FindData) {
     // FindData.isApproved = true;
   await FindData.updateOne({ Deactive: false });
      res.send({
        message: "Product has been set as sold successfully",
        data : FindData,
      });
    } else {
      res.status(404).send({
        message: "No Product found with this id: " + id,
      });
    }
    console.log("data",FindData);
    console.log("id",id);
  } catch (err) {
    res.status(500).send({
      message: "Server error",
    });
  }

});

app.put("/edittedlisting/:id", async (req,res) => {

  const UserID = req.params.id;
  const updatedUserData = req.body;

  try{
  const product = await productmodel.findByIdAndUpdate(UserID, updatedUserData, {
    new: true, 
  });
  if (!product) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(product);
}
catch {
  res.status(500).json({ message: 'Server Error' });
}
});

app.put("/editteduser/:id", async (req,res) => {

  const UserID = req.params.id;
  const updatedUserData = req.body;
  const packagename = req.body.packagename;
console.log("pac",packagename)
  try{
  const product = await listers.findByIdAndUpdate(UserID, updatedUserData, {
    new: true, 
  });
  if (!product) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(product);
}
catch {
  res.status(500).json({ message: 'Server Error' });
}
});
app.get("/deactivatelisting/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const FindData = await productmodel.findById({ _id: id });

    if (FindData) {
     // FindData.isApproved = true;
   await FindData.updateOne({ Deactive: true });
      res.send({
        message: "Product has been set as sold successfully",
        data : FindData,
      });
    } else {
      res.status(404).send({
        message: "No Product found with this id: " + id,
      });
    }
    console.log("data",FindData);
    console.log("id",id);
  } catch (err) {
    res.status(500).send({
      message: "Server error",
    });
  }

});

app.get("/approvelisting/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const FindData = await productmodel.findById({ _id: id });

    if (FindData) {
     // FindData.isApproved = true;
   await FindData.updateOne({ isApproved: true });
      res.send({
        message: "Product has been sapproved successfully",
        data : FindData,
      });
    } else {
      res.status(404).send({
        message: "No Product found with this id: " + id,
      });
    }
    console.log("data",FindData);
    console.log("id",id);
  } catch (err) {
    res.status(500).send({
      message: "Server error",
    });
  }

});
app.get("/bestlistingactive/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const FindData = await productmodel.findById({ _id: id });

    if (FindData) {
     // FindData.isApproved = true;
   await FindData.updateOne({ bestSeller: true });
      res.send({
        message: "Product has been set as sold successfully",
        data : FindData,
      });
    } else {
      res.status(404).send({
        message: "No Product found with this id: " + id,
      });
    }
    console.log("data",FindData);
    console.log("id",id);
  } catch (err) {
    res.status(500).send({
      message: "Server error",
    });
  }

});
app.get("/bestlisterdeactive/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const FindData = await productmodel.findById({ _id: id });

    if (FindData) {
     // FindData.isApproved = true;
   await FindData.updateOne({ bestSeller: false });
      res.send({
        message: "Product has been set as sold successfully",
        data : FindData,
      });
    } else {
      res.status(404).send({
        message: "No Product found with this id: " + id,
      });
    }
    console.log("data",FindData);
    console.log("id",id);
  } catch (err) {
    res.status(500).send({
      message: "Server error",
    });
  }

});

app.get("/topsellingactive/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const FindData = await productmodel.findById({ _id: id });

    if (FindData) {
     // FindData.isApproved = true;
   await FindData.updateOne({ topSeller: true });
      res.send({
        message: "Product has been set as sold successfully",
        data : FindData,
      });
    } else {
      res.status(404).send({
        message: "No Product found with this id: " + id,
      });
    }
    console.log("data",FindData);
    console.log("id",id);
  } catch (err) {
    res.status(500).send({
      message: "Server error",
    });
  }

});
app.get("/toplisterdeactive/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const FindData = await productmodel.findById({ _id: id });

    if (FindData) {
     // FindData.isApproved = true;
   await FindData.updateOne({ topSeller: false });
      res.send({
        message: "Product has been set as sold successfully",
        data : FindData,
      });
    } else {
      res.status(404).send({
        message: "No Product found with this id: " + id,
      });
    }
    console.log("data",FindData);
    console.log("id",id);
  } catch (err) {
    res.status(500).send({
      message: "Server error",
    });
  }

});
app.delete("/deletelist/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const deletedData = await productmodel.deleteOne({ _id: id });

    if (deletedData.deletedCount !== 0) {
      res.send({
        message: "Listing has been deleted successfully",
      });
    } else {
      res.status(404).send({
        message: "No mentor found with this id: " + id,
      });
    }
    console.log("id",id);
  } catch (err) {
    res.status(500).send({
      message: "Server error",
    });
  }
});

app.get("/api/searchlist", async (req, res) => {
  const searchParams = {};
      console.log("src",req.query)

  // Check if query parameters exist and add them to the search parameters
  if (req.query.location) {
    searchParams.location = new RegExp(req.query.location, "i");
  }
  if (req.query.price) {
    searchParams.price = new RegExp(req.query.price, "i");
  }
  if (req.query.productname) {
    searchParams.productname = new RegExp(req.query.productname, "i");
  }


  try {
    const results = await productmodel.find(searchParams);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

//logout 


// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
