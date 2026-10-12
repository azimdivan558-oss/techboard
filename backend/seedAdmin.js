import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "./models/User.js";

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected");

    // =========================
    // ADMIN
    // =========================

    const adminEmail = "admin2@gmail.com";
    const adminPassword = "admin123";

    const existingAdmin = await User.findOne({
      email: adminEmail,
    });

    if (!existingAdmin) {
      await User.create({
        name: "TechBoard Admin",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
      });

      console.log("✅ Admin Created");
    } else {
      console.log("ℹ️ Admin already exists");
    }

    // =========================
    // ADMIN LOGIN DETAILS
    // =========================

    console.log("");
    console.log("================================");
    console.log("       ADMIN LOGIN DETAILS");
    console.log("================================");
    console.log("Email:", adminEmail);
    console.log("Password:", adminPassword);
    console.log("================================");

    await mongoose.connection.close();

    process.exit(0);

  } catch (error) {
    console.error("❌ Seed Error:", error.message);

    await mongoose.connection.close();

    process.exit(1);
  }
};

seedData();