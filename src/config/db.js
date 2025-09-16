import mongoose from 'mongoose';
import models from '../models/index.js';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGOURL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Database connected!');

        await Promise.all(Object.values(models).map(m => m.init()))
    } catch (error) {
        console.log(`Connect database failed: ${error.message}`);
        process.exit(1);
    }
}

export default connectDB;