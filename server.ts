import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { MongoClient, MongoClientOptions, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Load environment variables if not running inside AI Studio
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

app.use(express.json({ limit: "15mb" }));

// In-memory Database Fallback for development/testing if MongoDB is not connected
interface SavedUser {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  registeredAt: string;
  selectedCourseIds: string[];
}

const localUserDb = new Map<string, SavedUser>();

interface SavedCourse {
  id: string;
  title: string;
  code: string;
  category: string;
  duration: string;
  instructor: string;
}

const DEFAULT_COURSES: SavedCourse[] = [
  {
    id: 'dev-101',
    title: 'Advanced React & Next.js Frameworks',
    code: 'CS-NEXT-501',
    category: 'Development',
    duration: '40 Hours',
    instructor: 'Dr. Sarah Jenkins'
  },
  {
    id: 'dev-102',
    title: 'Full-Stack Web Development with Node.js',
    code: 'CS-FS-202',
    category: 'Development',
    duration: '60 Hours',
    instructor: 'Alex Rivera'
  },
  {
    id: 'des-201',
    title: 'UI/UX Design Masterclass & Design Systems',
    code: 'DS-UIUX-401',
    category: 'Design',
    duration: '32 Hours',
    instructor: 'Elena Rostova'
  },
  {
    id: 'ds-301',
    title: 'Modern Machine Learning & Deep Learning',
    code: 'DS-ML-602',
    category: 'Data Science',
    duration: '54 Hours',
    instructor: 'Prof. Michael Chen'
  },
  {
    id: 'ds-302',
    title: 'Data Visualization with D3.js and Recharts',
    code: 'DS-D3-305',
    category: 'Data Science',
    duration: '24 Hours',
    instructor: 'Marcus Aurel'
  },
  {
    id: 'bus-401',
    title: 'Agile Product Management & Product Growth',
    code: 'PM-AGILE-310',
    category: 'Business',
    duration: '28 Hours',
    instructor: 'Sophia Vanguard'
  }
];

const localCourseDb: SavedCourse[] = [...DEFAULT_COURSES];

let coursesExplicitlyDeleted = false;

let globalCertificateDesign = {
  title: "CERTIFICATE OF COMPLETION",
  subtitle: "OFFICIAL STUDENT ACHIEVEMENT CREDENTIAL",
  signatureText: "Dr. Sarah Jenkins",
  signatureTitle: "Academic Director & Lead Dean",
  sealText: "VERIFIED",
  showSubtitle: true,
  showDate: true,
  showId: true,
  showSignature: true,
  showSeal: true,
  recipientPrefix: "This is proudly presented to",
  bodyText: "for successfully completing all academic requirements, practical assessments, and hands-on laboratory exercises for the specialized curriculum in",
  dateLabel: "Date of Issuance",
  logoUrl: "",
  showLogo: true,
  logoSize: 56
};

// Initialize default users in the fallback storage
localUserDb.set("eleanor.vance@education.edu", {
  id: "fall-1",
  name: "Eleanor Vance",
  email: "eleanor.vance@education.edu",
  passwordHash: bcrypt.hashSync("password123", 10),
  registeredAt: "June 20, 2026",
  selectedCourseIds: ["dev-101", "des-201", "ds-301"]
});

localUserDb.set("nuddywale@gmail.com", {
  id: "admin-1",
  name: "Nuddy Wale Admin",
  email: "nuddywale@gmail.com",
  passwordHash: bcrypt.hashSync("adewale009", 10),
  registeredAt: "June 20, 2026",
  selectedCourseIds: ["dev-101", "des-201", "ds-301"]
});

// Lazy MongoDB Connection
let mongoClient: MongoClient | null = null;
let isConnected = false;

async function getMongoDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return null;
  }
  
  if (mongoClient && isConnected) {
    return mongoClient.db();
  }

  try {
    mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
    } as MongoClientOptions);
    await mongoClient.connect();
    isConnected = true;
    console.log("Successfully connected to MongoDB Atlas database.");
    
    // Auto-seed/validate admin user
    const db = mongoClient.db();
    const usersCollection = db.collection("users");
    const adminEmail = "nuddywale@gmail.com";
    const existingAdmin = await usersCollection.findOne({ email: adminEmail });
    const passwordHash = bcrypt.hashSync("adewale009", 10);
    const registeredAt = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    if (!existingAdmin) {
      console.log("Seeding admin user into MongoDB");
      await usersCollection.insertOne({
        name: "Nuddy Wale Admin",
        email: adminEmail,
        passwordHash,
        isAdmin: true,
        registeredAt,
        selectedCourseIds: ["dev-101", "des-201", "ds-301"]
      });
    } else {
      await usersCollection.updateOne(
        { email: adminEmail },
        { $set: { passwordHash, isAdmin: true } }
      );
    }

    // Auto-seed/validate courses catalog collection if empty
    const coursesCollection = db.collection("courses");
    const coursesCount = await coursesCollection.countDocuments();
    let isExplicitlyDeletedInDb = false;
    try {
      const settingsCollection = db.collection("settings");
      const coursesState = await settingsCollection.findOne({ id: "courses_state" });
      if (coursesState) {
        isExplicitlyDeletedInDb = !!coursesState.explicitlyDeleted;
      }
    } catch (e) {
      console.warn("Could not query courses_state collection:", e);
    }

    if (coursesCount === 0 && !coursesExplicitlyDeleted && !isExplicitlyDeletedInDb) {
      console.log("Seeding default courses catalog into MongoDB");
      await coursesCollection.insertMany(DEFAULT_COURSES);
    }

    // Seed or load dynamic certificate design
    const certDesignCollection = db.collection("certificate_design");
    const certDesignDoc = await certDesignCollection.findOne({});
    if (certDesignDoc) {
      globalCertificateDesign = {
        title: certDesignDoc.title || globalCertificateDesign.title,
        subtitle: certDesignDoc.subtitle || globalCertificateDesign.subtitle,
        signatureText: certDesignDoc.signatureText || globalCertificateDesign.signatureText,
        signatureTitle: certDesignDoc.signatureTitle || globalCertificateDesign.signatureTitle,
        sealText: certDesignDoc.sealText || globalCertificateDesign.sealText,
        showSubtitle: certDesignDoc.showSubtitle !== undefined ? certDesignDoc.showSubtitle : globalCertificateDesign.showSubtitle,
        showDate: certDesignDoc.showDate !== undefined ? certDesignDoc.showDate : globalCertificateDesign.showDate,
        showId: certDesignDoc.showId !== undefined ? certDesignDoc.showId : globalCertificateDesign.showId,
        showSignature: certDesignDoc.showSignature !== undefined ? certDesignDoc.showSignature : globalCertificateDesign.showSignature,
        showSeal: certDesignDoc.showSeal !== undefined ? certDesignDoc.showSeal : globalCertificateDesign.showSeal,
        recipientPrefix: certDesignDoc.recipientPrefix || globalCertificateDesign.recipientPrefix,
        bodyText: certDesignDoc.bodyText || globalCertificateDesign.bodyText,
        dateLabel: certDesignDoc.dateLabel || globalCertificateDesign.dateLabel,
        logoUrl: certDesignDoc.logoUrl !== undefined ? certDesignDoc.logoUrl : globalCertificateDesign.logoUrl,
        showLogo: certDesignDoc.showLogo !== undefined ? certDesignDoc.showLogo : globalCertificateDesign.showLogo,
        logoSize: certDesignDoc.logoSize !== undefined ? Number(certDesignDoc.logoSize) : globalCertificateDesign.logoSize,
      };
    } else {
      await certDesignCollection.insertOne(globalCertificateDesign);
    }

    return db;
  } catch (err) {
    console.error("Warning: Failed to connect to MongoDB Atlas host. Falling back to secure in-memory context.", err);
    isConnected = false;
    mongoClient = null;
    return null;
  }
}

// REST API Endpoints

// 1. Get database connectivity state
app.get("/api/db-state", async (req, res) => {
  const uriProvided = !!process.env.MONGODB_URI;
  const dbConnected = isConnected;
  res.json({
    usingAtlas: uriProvided && dbConnected,
    mode: (uriProvided && dbConnected) ? "MongoDB Atlas" : "Secure Memory Cache (MongoDB offline)",
    configured: uriProvided,
    googleClientId: process.env.GOOGLE_CLIENT_ID || null
  });
});

// 2. Register new student account
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, selectedCourseIds } = req.body;
    
    if (!name || !email || !password || !selectedCourseIds || selectedCourseIds.length === 0) {
      return res.status(400).json({ error: "Missing required registration parameters." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(password, 10);
    const registeredAt = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const db = await getMongoDb();
    if (db) {
      // Use MongoDB Collection
      const usersCollection = db.collection("users");
      const existing = await usersCollection.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(400).json({ error: "A student account is already registered with this email address." });
      }

      const newUser = {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        registeredAt,
        selectedCourseIds
      };
      const result = await usersCollection.insertOne(newUser);
      
      const payload = { email: normalizedEmail, id: result.insertedId.toString() };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

      return res.json({
        token,
        user: {
          name: name.trim(),
          email: normalizedEmail,
          registeredAt,
          selectedCourseIds,
          isAdmin: normalizedEmail === "nuddywale@gmail.com"
        }
      });
    } else {
      // Use Memory Cache Fallback
      if (localUserDb.has(normalizedEmail)) {
        return res.status(400).json({ error: "A student account is already registered with this email address." });
      }

      const id = "mem_" + Math.random().toString(36).substr(2, 9);
      const newUser: SavedUser = {
        id,
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        registeredAt,
        selectedCourseIds
      };
      localUserDb.set(normalizedEmail, newUser);

      const payload = { email: normalizedEmail, id };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

      return res.json({
        token,
        user: {
          name: name.trim(),
          email: normalizedEmail,
          registeredAt,
          selectedCourseIds,
          isAdmin: normalizedEmail === "nuddywale@gmail.com"
        }
      });
    }
  } catch (err: any) {
    console.error("Register Error:", err);
    res.status(500).json({ error: "Internal server compilation or data insert failed." });
  }
});

// 3. Login existing student
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required credentials." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = await getMongoDb();

    if (db) {
      const usersCollection = db.collection("users");
      const dbUser = await usersCollection.findOne({ email: normalizedEmail });
      if (!dbUser) {
        return res.status(401).json({ error: "Invalid email or password combination." });
      }

      if (!dbUser.passwordHash) {
        return res.status(400).json({ error: "This account signed up with Google. Please use Google Sign-In." });
      }

      const isValid = await bcrypt.compare(password, dbUser.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password combination." });
      }

      const payload = { email: dbUser.email, id: dbUser._id.toString() };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

      return res.json({
        token,
        user: {
          name: dbUser.name,
          email: dbUser.email,
          registeredAt: dbUser.registeredAt || "June 20, 2026",
          selectedCourseIds: dbUser.selectedCourseIds || ["dev-101"],
          isAdmin: dbUser.isAdmin || dbUser.email === "nuddywale@gmail.com"
        }
      });
    } else {
      // Memory check
      const memUser = localUserDb.get(normalizedEmail);
      if (!memUser) {
        return res.status(401).json({ error: "Invalid email or password combination." });
      }

      if (!memUser.passwordHash) {
        return res.status(400).json({ error: "This account signed up with Google. Please use Google Sign-In." });
      }

      const isValid = await bcrypt.compare(password, memUser.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password combination." });
      }

      const payload = { email: memUser.email, id: memUser.id };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

      return res.json({
        token,
        user: {
          name: memUser.name,
          email: memUser.email,
          registeredAt: memUser.registeredAt,
          selectedCourseIds: memUser.selectedCourseIds,
          isAdmin: memUser.email === "nuddywale@gmail.com"
        }
      });
    }
  } catch (err: any) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Failed to authenticate credential." });
  }
});

// 4. Google Sign In token exchange / creation
app.post("/api/auth/google", async (req, res) => {
  try {
    const { name, email, googleId, imageUrl } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: "Google payload lacks email address or display name." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const registeredAt = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const db = await getMongoDb();
    if (db) {
      const usersCollection = db.collection("users");
      let dbUser = await usersCollection.findOne({ email: normalizedEmail });

      if (!dbUser) {
        // Retrieve dynamic courses from database to assign valid course references
        let defaultCourses = ["dev-101", "des-201"];
        try {
          const dbCourses = await db.collection("courses").find({}).toArray();
          if (dbCourses.length > 0) {
            defaultCourses = dbCourses.map(c => c.id);
          }
        } catch (e) {
          console.warn("Failed retrieving dynamic courses for Google registration fallback:", e);
        }

        // Create user
        const newUser = {
          name: name.trim(),
          email: normalizedEmail,
          googleId: googleId || "goog_" + Math.random().toString(36).substr(2, 9),
          registeredAt,
          selectedCourseIds: defaultCourses
        };
        const result = await usersCollection.insertOne(newUser);
        dbUser = { ...newUser, _id: result.insertedId };
      }

      const payload = { email: dbUser.email, id: dbUser._id.toString() };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

      return res.json({
        token,
        user: {
          name: dbUser.name,
          email: dbUser.email,
          registeredAt: dbUser.registeredAt,
          selectedCourseIds: dbUser.selectedCourseIds,
          isAdmin: dbUser.isAdmin || dbUser.email === "nuddywale@gmail.com"
        }
      });
    } else {
      // Memory db
      let memUser = localUserDb.get(normalizedEmail);
      if (!memUser) {
        let defaultCourses = ["dev-101", "des-201"];
        if (localCourseDb && localCourseDb.length > 0) {
          defaultCourses = localCourseDb.map(c => c.id);
        }

        const id = "mem_" + Math.random().toString(36).substr(2, 9);
        memUser = {
          id,
          name: name.trim(),
          email: normalizedEmail,
          googleId: googleId || "goog_" + Math.random().toString(36).substr(2, 9),
          registeredAt,
          selectedCourseIds: defaultCourses
        };
        localUserDb.set(authorizedEmail(normalizedEmail), memUser);
      }

      function authorizedEmail(e: string) { return e; }

      const payload = { email: memUser.email, id: memUser.id };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

      return res.json({
        token,
        user: {
          name: memUser.name,
          email: memUser.email,
          registeredAt: memUser.registeredAt,
          selectedCourseIds: memUser.selectedCourseIds,
          isAdmin: memUser.email === "nuddywale@gmail.com"
        }
      });
    }
  } catch (err: any) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Failed to exchange Google OAuth details." });
  }
});

// Helper for validating JWT tokens
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing authentication authorization token header." });
  }

  jwt.verify(token, JWT_SECRET, (err: any, tokenDecoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Expired or invalid signature token session." });
    }
    (req as any).user = tokenDecoded;
    next();
  });
};

// 5. Get current identity
app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
  try {
    const email = req.user.email;
    const db = await getMongoDb();

    if (db) {
      const usersCollection = db.collection("users");
      const dbUser = await usersCollection.findOne({ email });
      if (!dbUser) {
        return res.status(404).json({ error: "Student profile record not found." });
      }
      res.json({
        user: {
          name: dbUser.name,
          email: dbUser.email,
          registeredAt: dbUser.registeredAt,
          selectedCourseIds: dbUser.selectedCourseIds || [],
          isAdmin: dbUser.isAdmin || dbUser.email === "nuddywale@gmail.com"
        }
      });
    } else {
      const memUser = localUserDb.get(email);
      if (!memUser) {
        return res.status(404).json({ error: "Student profile record not found." });
      }
      res.json({
        user: {
          name: memUser.name,
          email: memUser.email,
          registeredAt: memUser.registeredAt,
          selectedCourseIds: memUser.selectedCourseIds,
          isAdmin: memUser.email === "nuddywale@gmail.com"
        }
      });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal profile lookup failure." });
  }
});

// 6. Admin Portal: view all student registries
app.get("/api/admin/students", authenticateToken, async (req: any, res) => {
  try {
    const callerEmail = req.user.email;
    if (callerEmail !== "nuddywale@gmail.com") {
      return res.status(403).json({ error: "Denied. Only authorized administrators may query student records." });
    }

    const db = await getMongoDb();
    if (db) {
      const usersCollection = db.collection("users");
      const allDbUsers = await usersCollection.find({}).toArray();
      const students = allDbUsers.map(student => ({
        id: student._id.toString(),
        name: student.name,
        email: student.email,
        registeredAt: student.registeredAt || "June 20, 2026",
        selectedCourseIds: student.selectedCourseIds || [],
        isAdmin: student.isAdmin || student.email === "nuddywale@gmail.com"
      }));
      return res.json({ students });
    } else {
      // Return students from local in-memory dataset
      const students = Array.from(localUserDb.values()).map(student => ({
        id: student.id,
        name: student.name,
        email: student.email,
        registeredAt: student.registeredAt,
        selectedCourseIds: student.selectedCourseIds,
        isAdmin: student.email === "nuddywale@gmail.com"
      }));
      return res.json({ students });
    }
  } catch (err) {
    console.error("Fetch administrative student index error:", err);
    res.status(500).json({ error: "Internal administrative query failed." });
  }
});

// 6b. Admin Portal: delete a student registry profile by ID
app.delete("/api/admin/students/:id", authenticateToken, async (req: any, res) => {
  try {
    const callerEmail = req.user.email;
    if (callerEmail !== "nuddywale@gmail.com") {
      return res.status(403).json({ error: "Denied. Only authorized administrators may delete student registrations." });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing student identification parameter." });
    }

    const db = await getMongoDb();
    if (db) {
      const usersCollection = db.collection("users");
      
      // Find the user first to make sure we don't delete the main admin
      let userToDelete = null;
      try {
        userToDelete = await usersCollection.findOne({ _id: new ObjectId(id) });
      } catch (err) {
        userToDelete = await usersCollection.findOne({ id: id });
      }

      if (!userToDelete) {
        // Fallback search by email
        userToDelete = await usersCollection.findOne({ email: id });
      }

      if (userToDelete && userToDelete.email === "nuddywale@gmail.com") {
        return res.status(400).json({ error: "Safety Alert: System administrator accounts cannot be deleted to prevent locking out this workspace." });
      }

      let result = { deletedCount: 0 };
      try {
        result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
      } catch (err) {
        result = await usersCollection.deleteOne({ id: id });
      }

      if (result.deletedCount === 0 && userToDelete) {
        // Attempt deletion by email
        const emailResult = await usersCollection.deleteOne({ email: userToDelete.email });
        if (emailResult.deletedCount === 0) {
          return res.status(404).json({ error: "The student record could not be found." });
        }
      } else if (result.deletedCount === 0) {
        return res.status(404).json({ error: "The student record could not be found." });
      }
    } else {
      // Memory DB fallback
      let userEmailToDelete = null;
      for (const [email, user] of localUserDb.entries()) {
        if (user.id === id || user.email === id) {
          userEmailToDelete = email;
          break;
        }
      }

      if (userEmailToDelete) {
        if (userEmailToDelete === "nuddywale@gmail.com") {
          return res.status(400).json({ error: "Safety Alert: System administrator accounts cannot be deleted to prevent locking out this workspace." });
        }
        localUserDb.delete(userEmailToDelete);
      } else {
        return res.status(404).json({ error: "The student record could not be found under the in-memory dataset." });
      }
    }

    res.json({ success: true, message: "The selected academic student enrollment profile has been permanently deleted." });
  } catch (err) {
    console.error("Administrative delete student profile error:", err);
    res.status(500).json({ error: "Failed to delete the selected student profile." });
  }
});

// 7. Courses API: list active course curriculum catalog
app.get("/api/courses", async (req, res) => {
  try {
    const db = await getMongoDb();
    if (db) {
      const dbCourses = await db.collection("courses").find({}).toArray();
      const courses = dbCourses.map(c => ({
        id: c.id,
        title: c.title,
        code: c.code,
        category: c.category,
        duration: c.duration,
        instructor: c.instructor,
      }));
      return res.json({ courses });
    } else {
      return res.json({ courses: localCourseDb });
    }
  } catch (err) {
    console.error("Failed fetching courses list:", err);
    res.status(500).json({ error: "Failed to retrieve courses catalog details." });
  }
});

// 8. Administrative Courses API: add a new certified course record
app.post("/api/admin/courses", authenticateToken, async (req: any, res) => {
  try {
    const callerEmail = req.user.email;
    if (callerEmail !== "nuddywale@gmail.com") {
      return res.status(403).json({ error: "Denied. Only authorized administrators may insert course records." });
    }

    const { title, code, category, duration, instructor } = req.body;
    if (!title || !code || !category || !duration || !instructor) {
      return res.status(400).json({ error: "Missing required fields. Please specify code, title, category, duration and instructor." });
    }

    const cleanTitle = title.trim();
    const cleanCode = code.trim().toUpperCase();
    const cleanCategory = category.trim();
    const cleanDuration = duration.trim();
    const cleanInstructor = instructor.trim();

    // Create an elegant unique id
    const generatedId = cleanTitle.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Math.floor(Math.random() * 900 + 100);

    const newCourse = {
      id: generatedId,
      title: cleanTitle,
      code: cleanCode,
      category: cleanCategory,
      duration: cleanDuration,
      instructor: cleanInstructor
    };

    const db = await getMongoDb();
    if (db) {
      const coursesCollection = db.collection("courses");
      const dupe = await coursesCollection.findOne({ code: cleanCode });
      if (dupe) {
        return res.status(400).json({ error: `A courses catalog record with code '${cleanCode}' already exists.` });
      }
      await coursesCollection.insertOne(newCourse);
      
      try {
        const settingsCollection = db.collection("settings");
        await settingsCollection.updateOne(
          { id: "courses_state" },
          { $set: { explicitlyDeleted: false } },
          { upsert: true }
        );
      } catch (e) {
        console.warn("Could not reset courses_state settings:", e);
      }
    } else {
      const dupe = localCourseDb.find(c => c.code === cleanCode);
      if (dupe) {
        return res.status(400).json({ error: `A courses catalog record with code '${cleanCode}' already exists.` });
      }
      localCourseDb.push(newCourse);
    }

    res.status(201).json({ success: true, course: newCourse });
  } catch (err) {
    console.error("Administrative insert course error:", err);
    res.status(500).json({ error: "Failed to save the new administrator course record." });
  }
});

// 9. Administrative Courses API: delete all course records
app.delete("/api/admin/courses", authenticateToken, async (req: any, res) => {
  try {
    const callerEmail = req.user.email;
    if (callerEmail !== "nuddywale@gmail.com") {
      return res.status(403).json({ error: "Denied. Only authorized administrators may delete course records." });
    }

    coursesExplicitlyDeleted = true;

    const db = await getMongoDb();
    if (db) {
      const coursesCollection = db.collection("courses");
      await coursesCollection.deleteMany({});
      try {
        const settingsCollection = db.collection("settings");
        await settingsCollection.updateOne(
          { id: "courses_state" },
          { $set: { explicitlyDeleted: true } },
          { upsert: true }
        );
      } catch (e) {
        console.warn("Could not save courses explicitlyDeleted setting:", e);
      }
    } else {
      localCourseDb.length = 0;
    }

    res.json({ success: true, message: "All course catalog records have been successfully purged." });
  } catch (err) {
    console.error("Administrative clear courses error:", err);
    res.status(500).json({ error: "Failed to purge database course records." });
  }
});

// 10. Administrative Courses API: delete an individual course record by ID
app.delete("/api/admin/courses/:id", authenticateToken, async (req: any, res) => {
  try {
    const callerEmail = req.user.email;
    if (callerEmail !== "nuddywale@gmail.com") {
      return res.status(403).json({ error: "Denied. Only authorized administrators may delete course records." });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing course identification parameter." });
    }

    const db = await getMongoDb();
    if (db) {
      const coursesCollection = db.collection("courses");
      const result = await coursesCollection.deleteOne({ id });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "The selected course record could not be found." });
      }

      // If no courses remain, mark as explicitly deleted so we don't auto-seed
      const remainingCount = await coursesCollection.countDocuments();
      if (remainingCount === 0) {
        try {
          const settingsCollection = db.collection("settings");
          await settingsCollection.updateOne(
            { id: "courses_state" },
            { $set: { explicitlyDeleted: true } },
            { upsert: true }
          );
        } catch (e) {
          console.warn("Could not set database course explicitlyDeleted flag:", e);
        }
      }
    } else {
      const index = localCourseDb.findIndex(c => c.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "The selected course record could not be found." });
      }
      localCourseDb.splice(index, 1);
    }

    res.json({ success: true, message: "The selected certified course record was successfully deleted." });
  } catch (err) {
    console.error("Administrative delete course error:", err);
    res.status(500).json({ error: "Failed to delete the selected course record." });
  }
});

// 11. Certificate Design API: get active design parameters
app.get("/api/certificate-design", async (req, res) => {
  try {
    const db = await getMongoDb();
    if (db) {
      const doc = await db.collection("certificate_design").findOne({});
      if (doc) {
        return res.json({ design: doc });
      }
    }
    res.json({ design: globalCertificateDesign });
  } catch (err) {
    console.error("Fetch certificate design error:", err);
    res.status(500).json({ error: "Failed to load active certificate design parameters." });
  }
});

// 12. Administrative Certificate Design API: customize fields and template parameters
app.post("/api/admin/certificate-design", authenticateToken, async (req: any, res) => {
  try {
    const callerEmail = req.user.email;
    if (callerEmail !== "nuddywale@gmail.com") {
      return res.status(403).json({ error: "Denied. Only authorized administrators may design certificate structures." });
    }

    const { 
      title, 
      subtitle, 
      signatureText, 
      signatureTitle, 
      sealText,
      showSubtitle,
      showDate,
      showId,
      showSignature,
      showSeal,
      recipientPrefix,
      bodyText,
      dateLabel,
      logoUrl,
      showLogo,
      logoSize
    } = req.body;
 
    const newDesign = {
      title: title !== undefined ? title.trim() : globalCertificateDesign.title,
      subtitle: subtitle !== undefined ? subtitle.trim() : globalCertificateDesign.subtitle,
      signatureText: signatureText !== undefined ? signatureText.trim() : globalCertificateDesign.signatureText,
      signatureTitle: signatureTitle !== undefined ? signatureTitle.trim() : globalCertificateDesign.signatureTitle,
      sealText: sealText !== undefined ? sealText.trim().toUpperCase() : globalCertificateDesign.sealText,
      showSubtitle: showSubtitle !== undefined ? !!showSubtitle : globalCertificateDesign.showSubtitle,
      showDate: showDate !== undefined ? !!showDate : globalCertificateDesign.showDate,
      showId: showId !== undefined ? !!showId : globalCertificateDesign.showId,
      showSignature: showSignature !== undefined ? !!showSignature : globalCertificateDesign.showSignature,
      showSeal: showSeal !== undefined ? !!showSeal : globalCertificateDesign.showSeal,
      recipientPrefix: recipientPrefix !== undefined ? recipientPrefix.trim() : globalCertificateDesign.recipientPrefix,
      bodyText: bodyText !== undefined ? bodyText.trim() : globalCertificateDesign.bodyText,
      dateLabel: dateLabel !== undefined ? dateLabel.trim() : globalCertificateDesign.dateLabel,
      logoUrl: logoUrl !== undefined ? logoUrl.trim() : globalCertificateDesign.logoUrl,
      showLogo: showLogo !== undefined ? !!showLogo : globalCertificateDesign.showLogo,
      logoSize: logoSize !== undefined ? Number(logoSize) : globalCertificateDesign.logoSize,
    };

    globalCertificateDesign = { ...globalCertificateDesign, ...newDesign };

    const db = await getMongoDb();
    if (db) {
      const collection = db.collection("certificate_design");
      const exists = await collection.findOne({});
      if (exists) {
        await collection.updateOne({}, { $set: newDesign });
      } else {
        await collection.insertOne(newDesign);
      }
    }

    res.json({ success: true, message: "Certificate layout design saved successfully.", design: globalCertificateDesign });
  } catch (err) {
    console.error("Save certificate design error:", err);
    res.status(500).json({ error: "Failed to persist customized certificate layout design." });
  }
});

// start the Express and Vite dev/prod layers
async function startServer() {
  // Vite integration 
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    // Serve static files in standalone production environments (non-Vercel, like local node or container runtimes)
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[CertifySuite Service] Server running fine at http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();

export default app;
