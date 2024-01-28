import mongoose from 'mongoose';
const mongodbURI = process.env.mongodbURI || "mongodb://salikrafiq11111:testproduct@ac-aie48v0-shard-00-00.woezimw.mongodb.net:27017,ac-aie48v0-shard-00-01.woezimw.mongodb.net:27017,ac-aie48v0-shard-00-02.woezimw.mongodb.net:27017/?ssl=true&replicaSet=atlas-filkun-shard-0&authSource=admin&retryWrites=true&w=majority";
/////////////////////////////////////////////////////////////////////////////////////////////////

const productschema = new mongoose.Schema({
    productname: String,
    category: String,
    subcategory: String,
    gender: String,
    type: String,
    condition: String,
    propertystate: String,
    areaunit: String,
    areasize: String,
    career: String,
    position: String,
    whatsapp: String,
    mobile: String,
    location: String,
    price: String,
    listername: String,
    listerid: String,
    description: String,
    bestSeller: { type: Boolean, default: false },
    topSeller: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },
    Deactive: { type: Boolean, default: false },

    imageUrl1: String,
    imageUrl2: String,
    imageUrl3: String,
    imageUrl4: String,
    imageUrl5: String,
    imageUrl6: String,


    createdOn: { type: Date, default: Date.now },
});
 const productmodel = mongoose.model('products', productschema);

mongoose.connect(mongodbURI);
////////////////mongodb connected disconnected events///////////////////////////////////////////////
mongoose.connection.on('connected', function () {//connected
    console.log("Mongoose is connected");
});

mongoose.connection.on('disconnected', function () {//disconnected
    console.log("Mongoose is disconnected");
    process.exit(1);
});

mongoose.connection.on('error', function (err) {//any error
    console.log('Mongoose connection error: ', err);
    process.exit(1);
});

process.on('SIGINT', function () {/////this function will run jst before app is closing
    console.log("app is terminating");
    mongoose.connection.close(function () {
        console.log('Mongoose default connection closed');
        process.exit(0);
    });
});
////////////////mongodb connected disconnected events///////////////////////////////////////////////

export default productmodel;
