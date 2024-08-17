import express, { json } from "express";
import mysql, { createConnection } from "mysql";
import cors from "cors";
import path from "path";
import bodyParser from "body-parser";
import { log } from "console";
import multer from "multer";
import fileUpload from 'express-fileupload';
import fs from 'fs';
import admin from 'firebase-admin';
import { initializeApp } from "firebase/app";
import { getStorage, ref } from "firebase/storage";
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCCqn6ectArvQ_zUvN1fSm1_QSAuooapLo",
  authDomain: "pesticide-supply.firebaseapp.com",
  projectId: "pesticide-supply",
  storageBucket: "pesticide-supply.appspot.com",
  messagingSenderId: "1076388899331",
  appId: "1:1076388899331:web:6760fb0fa8c7feb0a0bc36",
  measurementId: "G-MJSF72TR6M"
};


const firebaseApp = initializeApp(firebaseConfig);
// const analytics = getAnalytics(firebaseApp);
const appStorage = getStorage();

const app = express();

app.use(cors());
app.use(express.json());
const __dirname = new URL('.', import.meta.url).pathname;
// Middleware for serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware for handling file uploads
app.use(fileUpload());

// Serve static files from the 'views' directory
app.use(express.static(path.join(__dirname, 'uploads')));
app.use(express.static('uploads'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');


const dbConfig = {
  host: '127.0.0.1',
  user: 'api',
  password: '1234',
  database: 'pesticide'
};




const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images'); // Change 'uploads/' to your desired directory
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "_" + Date.now() + "_" + file.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const pool = mysql.createPool(dbConfig);
const connection = () => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) reject(err);
      console.log("MySQL pool connected: threadId " + connection.threadId);
      const query = (sql, binding) => {
        return new Promise((resolve, reject) => {
          connection.query(sql, binding, (err, result) => {
            if (err) reject(err);
            resolve(result);
          });
        });
      };
      const release = () => {
        return new Promise((resolve, reject) => {
          if (err) reject(err);
          console.log("MySQL pool released: threadId " + connection.threadId);
          resolve(connection.release());
        });
      };
      resolve({ query, release });
    });
  });
};
const query = (sql, binding) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, binding, (err, result, fields) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};


function fetchProducts(callback) {
  const query = 'SELECT * FROM products'; // Assuming your table name is 'products'
  connection()
    .then(conn => {
      conn.query(query, (error, results) => {
        if (error) {
          callback(error, null);
          return;
        }
        callback(null, results);
        conn.release();
      });
    })
    .catch(error => {
      callback(error, null);
    });
}


app.get('/products', (req, res) => {
  // Fetch products from the database
  fetchProducts((error, products) => {
    if (error) {
      // Handle error
      res.status(500).send('Error fetching products');
      return;
    }

    products.forEach(element => {
      console.log(element)
    });
    // Pass the products data to the EJS template when rendering
    res.render('products', { products });
  });
});


app.get('/adminview', (req, res) => {
  // Fetch products from the database
  fetchProducts((error, products) => {
    if (error) {
      // Handle error
      res.status(500).send('Error fetching products');
      return;
    }
    // Pass the products data to the EJS template when rendering
    res.render('adminview', { products });
  });
});
// Routes
app.get('/', (req, res) => {
  res.render("index.ejs");
});
app.get('/createaccount', (req, res) => {
  res.render("createaccount.ejs");
});


app.get('/home', (req, res) => {
  res.render("home.ejs");
});



app.get('/admin', (req, res) => {
  res.render("admin.ejs");
});

app.get('/contacts', (req, res) => {
  res.render("contacts.ejs");
});
app.get('/pricing', (req, res) => {
  res.render("pricing.ejs");
});


app.get('/pay', (req, res) => {
  res.render("pay.ejs");
});



const addProduct = async (product, price, dosage, target, description, image) => new Promise(async (resolve, reject) => {
  var imageURL = ""
  try {
    console.log("Logging")
    console.log(image);
    imageURL = await uploadImage(image);
    console.log("Uploaded")

  } catch {
    console.log("errror")
    imageURL = ""
  }

  resolve(true);
})

/*
const getProducts = async () => new Promise(async (resolve, reject) => {
  try {
    const query = 'SELECT * FROM products'; // SQL query to retrieve all products
    const products = await query(query); // Execute the query to fetch products from the database
    resolve(products); // Resolve the promise with the retrieved products
  } catch (error) {
    reject(error); // Reject the promise if an error occurs
  }
});

// Example usage:
getProducts()
  .then(products => {
    console.log('Retrieved products:', products);
  })
  .catch(error => {
    console.error('Error fetching products:', error);
  });
*/











//app.posts
app.post('/signup', (req, res) => {
  const sql = "INSERT INTO login (`fname`, `lname`, `email`, `password`, `pwd`) VALUES(?, ?, ? ,?, ?)";
  const values = [
    req.body.fname,
    req.body.lname,
    req.body.email,
    req.body.password,
    req.body.pwd
  ];
  pool.query(sql, values, (err, data) => {
    if (err) {
      console.error('Error inserting data into MySQL: ', err);
      res.status(500).send('Error inserting data into MySQL');
      return;
    }
    else {
      // res.json("data");
      res.redirect("/");
    }
  });
});


//user login
app.post('/login', (req, res) => {
  signIn(req.body.email, req.body.password)
    .then((result) => {
      console.log(result);
      if (result)
        res.status(200).redirect("/home");
      else
        res.status(200).send(`Check password for ${req.body.email}`);
    })
    .catch((e) => {
      res.status(500).send("Could not sign in");
    });
})

const signIn = async (email, password) => new Promise(async (resolve, reject) => {
  const conn = await connection();
  try {
    console.log("Siging in...");
    const sql = ("SELECT * FROM login WHERE `email` = ? AND `password` = ?");
    let user = await conn.query(sql, [email, password]);
    console.log(user);

    return user[0] ? resolve("Success") : resolve("")
  } catch {
    return reject("");
  } finally {
    await conn.release();
  }
});
//admin login
/// Assuming you have a MySQL connection pool named `pool`
app.post("/admin", (req, res) => {
  const enteredName = req.body.name;
  const enteredPassword = req.body.password;

  // Query to check if the entered credentials are valid
  const sql = "SELECT * FROM admin WHERE name = ? AND password = ?";
  const values = [enteredName, enteredPassword];

  pool.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error querying MySQL: ', err);
      res.status(500).send('Error querying MySQL');
      return;
    }

    // Check if results contain any matching admin
    if (results.length > 0) {
      // Admin with matching credentials found, redirect to adminview
      res.redirect("/adminview");
    } else {
      // No admin found with matching credentials, render the login page with an error message
      res.render('admin', { error: 'Invalid username or password' });
    }
  });
});

app.post("/remove", (req, res) => {
  const id = req.body.id;
  pool.query("DELETE FROM products WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error('Error deleting product:', err);
      res.status(500).send('Error deleting product');
      return;
    }
    res.redirect("/adminview")
    // Redirect or send response as needed
  });
});

app.post("/buy", (req, res) => {
  const id = req.body.id;
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting database connection:', err);
      res.status(500).send('Error getting database connection');
      return;
    }

    // Begin transaction
    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        console.error('Error beginning transaction:', err);
        res.status(500).send('Error beginning transaction');
        return;
      }

      // Select product from products table
      connection.query("SELECT * FROM products WHERE id = ?", [id], (err, productResult) => {
        if (err) {
          connection.rollback(() => {
            connection.release();
            console.error('Error selecting product:', err);
            res.status(500).send('Error selecting product');
          });
          return;
        }

        const product = productResult[0]; // Assuming only one product is selected

        // Insert product into sold table
        connection.query("INSERT INTO sold (product, price, dosage, description, target, image) VALUES (?, ?, ?, ?, ?, ?)",
          [product.product, product.price, product.dosage, product.description, product.target, product.image],
          (err, insertResult) => {
            if (err) {
              connection.rollback(() => {
                connection.release();
                console.error('Error inserting into sold table:', err);
                res.status(500).send('Error inserting into sold table');
              });
              return;
            }

            // Delete product from products table
            connection.query("DELETE FROM products WHERE id = ?", [id], (err, deleteResult) => {
              if (err) {
                connection.rollback(() => {
                  connection.release();
                  console.error('Error deleting product:', err);
                  res.status(500).send('Error deleting product');
                });
                return;
              }

              // Release connection and redirect
              connection.release();
              res.redirect("/sold");
            });
          }
        );
      });
    });
  });
});

app.post("/upload_product", upload.single('image'), (req, res) => {
  console.log(req.image)
  console.log("Uploading...")
  addProduct(
    req.body.product,
    req.body.price,
    req.body.dosage,
    req.body.target,
    req.body.description,
    req.body.image).then((result) => {
      res.status(200).send(result)
    })
    .catch((error) => {
      res.status(500).send("Failed")
    });

});


//add products
app.post("/uploads", upload.single('image'), (req, res) => {
  const sql = "INSERT INTO products (`product`, `price`, `dosage`, `description`, `target`, `image`) VALUES(?, ?, ?, ?, ?, ?)";
  const values = [
    req.body.product,
    req.body.price,
    req.body.dosage,
    req.body.description,
    req.body.target,
    req.body.image
  ];

  pool.query(sql, values, (err, data) => {
    if (err) {
      console.error('Error inserting data into MySQL: ', err);
      res.status(500).send('Error inserting data into MySQL');
      return;
    }
    else {
      // res.json("data");
      res.redirect("/products");
    }
  });
});

// app.post("/reviews") route handler
app.post("/reviews", (req, res) => {
  const sql = "INSERT INTO reviews (`name`, `message` ) VALUES(?,?)";
  const values = [
    req.body.name,
    req.body.message
  ];

  pool.query(sql, values, (err, data) => {
    if (err) {
      console.error('Error inserting data into MySQL: ', err);
      res.status(500).send('Error inserting data into MySQL');
      return;
    }
    else {
      // res.json("data");
      res.redirect("/reviews");
    }
  });
});


function fetchReviews(callback) {
  const query = 'SELECT * FROM reviews'; // Assuming your table name is 'reviews'
  connection()
    .then(conn => {
      conn.query(query, (error, results) => {
        if (error) {
          callback(error, null);
          return;
        }
        callback(null, results);
        conn.release();
      });
    })
    .catch(error => {
      callback(error, null);
    });
}



app.get('/reviews', (req, res) => {
  // Fetch reviews from the database
  fetchReviews((error, reviews) => {
    if (error) {
      // Handle error
      res.status(500).send('Error fetching reviews');
      return;
    }
    // Pass the products data to the EJS template when rendering
    res.render('reviews', { reviews });
  });
});



app.get('/addproduct', (req, res) => {
  fetchReviews((error, reviews) => {
    if (error) {
      // Handle error
      res.status(500).send('Error fetching reviews');
      return;
    }
    // Pass the products data to the EJS template when rendering
    res.render("addproduct.ejs", { reviews });
  });

});

function fetchSold(callback) {
  const query = 'SELECT * FROM sold'; // Assuming your table name is 'reviews'
  connection()
    .then(conn => {
      conn.query(query, (error, results) => {
        if (error) {
          callback(error, null);
          return;
        }
        callback(null, results);
        conn.release();
      });
    })
    .catch(error => {
      callback(error, null);
    });
}


app.get("/sold", (req, res) => {
  fetchSold((error, sold) => {
    if (error) {
      // Handle error
      res.status(500).send('Error fetching sold');
      return;
    }
    // Pass the products data to the EJS template when rendering
    res.render("sold.ejs", { sold });
  });
})

app.get('/viewreviews', (req, res) => {
  fetchReviews((error, reviews) => {
    if (error) {
      // Handle error
      res.status(500).send('Error fetching reviews');
      return;
    }
    // Pass the products data to the EJS template when rendering
    res.render("viewreviews.ejs", { reviews });
  });

});
//taking images to uploads folder
// Use express-fileupload middleware



// Route for handling file upload
app.post('/upload', (req, res) => {
  console.log("Uploading")

  if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' });
  }

  // // Access the uploaded file from request object
  let uploadedFile = req.files.my_image;

  // // Move the uploaded file to the desired location (uploads folder)
  uploadedFile.mv(path.join(__dirname, 'uploads', uploadedFile.name), (err) => {
      if (err) {
          return res.status(500).json({ error: err.message });
      }

  //     // File upload successful
      res.json({ message: 'File uploaded successfully!', filename: uploadedFile.name });
  });
});



// Route for rendering products page
/* app.get('/products', (req, res) => {
   // Pass the uploaded image path or URL to the products.ejs template
   const imagePath = '/uploads/' + req.query.image; // Assuming req.query.image contains the filename of the uploaded image
   console.log(imagePath);

 res.render('products', { imagePath });
 });*/


// Function to fetch product details from the database
const fetchProductsFromDB = () => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM products"; // SQL query to select all products
    pool.query(sql, (err, results) => {
      if (err) {
        console.error('Error fetching products from MySQL: ', err);
        reject(err); // Reject the promise if an error occurs
      } else {
        // Process the results to include the image URLs
        const productsWithImages = results.map(product => {
          return {
            id: product.id,
            product: product.product,
            price: product.price,
            dosage: product.dosage,
            description: product.description,
            target: product.target,
            // Assuming the 'image' column stores image paths
            image: product.image ? `/uploads/${product.image}` : null // Adjust the path as needed
          };
        });
        resolve(productsWithImages); // Resolve the promise with the fetched products including image URLs
      }
    });
  });
};

// Example usage:
fetchProductsFromDB()
  .then(products => {
    console.log('Retrieved products:', products);
    // Here you can display the products, including their images
  })
  .catch(error => {
    console.error('Error fetching products:', error);
    // Handle error appropriately
  });




// Example route handler
app.get('/createaccount', (req, res) => {
  // Assume you retrieve error messages from the query parameters or any other source
  const error = req.query.error ? req.query.error : null;

  // Render the create account page with the error variable
  res.render('createaccount', { error: error });
});





app.listen(3000, () => {
  console.log("mfalme ni pabloh");
})

