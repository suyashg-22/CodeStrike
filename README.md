# ⚡ CODE STRIKE 

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)

**Code Strike** is a high-octane, 1v1 real-time competitive programming platform heavily inspired by the aesthetics and energy of Dragon Ball Z. 

### 🐉 The Problem & The Solution
**The Problem:** Traditional algorithm practice (like LeetCode or Codeforces) is a solitary, quiet, and often grueling experience. It lacks adrenaline, making coder burnout incredibly common. 

**The Solution:** Code Strike transforms algorithmic problem-solving into a high-stakes martial arts tournament. By combining real-time WebSockets, dynamic Elo matchmaking, and a cinematic, gamified UI, developers can test their logic against real opponents under intense time pressure. It makes getting better at algorithms *fun*.

---

## 📸 Platform Gallery

| The Gateway (Login) | Command Center (Dashboard) |
| :---: | :---: |
| <img src="https://github.com/user-attachments/assets/2282453d-8eda-44e6-bf71-09c424495735" width="400" alt="Login Screen"/> | <img src="https://github.com/user-attachments/assets/2c9d1957-fe79-4b43-b2ba-fb4b87e88167" width="400" alt="Dashboard Screen"/> |

| Hall of Legends (Leaderboard) | Hyperbolic Time Chamber |
| :---: | :---: |
| <img src="https://github.com/user-attachments/assets/fa18d1ba-167b-4eaa-bc00-376fefa35ade" width="400" alt="Leaderboard Screen"/> | <img src="https://github.com/user-attachments/assets/761ff7c5-6788-4157-a2c7-cd4c01651545" width="400" alt="Training Screen"/> |

| The Battlefield (Arena) | Live Code Execution |
| :---: | :---: |
| <img src="https://github.com/user-attachments/assets/a061a2a3-77ad-42d7-8a96-dca1e3f48d26" width="400" alt="Arena Screen"/> | <img src="https://github.com/user-attachments/assets/f0b6dd80-3aa6-413c-9568-6740648b7b7f" width="400" alt="Execution Screen"/> |

---

## 🚀 Core Features & Architecture

### ⚔️ The Matchmaking Engine
Instead of basic queuing, Code Strike uses a highly engineered **Background Tick Loop** that processes the queue every 2 seconds:
* **Expanding Search Radius:** Prevents infinite queue times. 
  * `0-10s`: Strict pairing (± 200 Elo).
  * `10-20s`: Moderate expansion (± 400 Elo).
  * `20s+`: Total barrier removal to guarantee a match.
* **Dynamic Temporal Limits:** Match duration scales based on the average Elo of the paired fighters:
  * **Beginner (<1400 Elo):** Easy algorithm, 10-Minute timer.
  * **Advanced (1400 - 1800 Elo):** Medium algorithm, 20-Minute timer.
  * **Elite (1800+ Elo):** Hard algorithm, 30-Minute timer.

### 🏟️ The Battlefield (Live Arena)
* **Real-Time Multiplayer:** Built on `Socket.io`, featuring live opponent progress bars and an integrated in-match Chat (Comm-Link).
* **Multi-Language Compiler:** Integrated with the **JDoodle API**, executing code securely in `JavaScript`, `Python 3`, or `C++`. Features a custom API-Pooling architecture to bypass strict rate limits.
* **Reactive Mascots:** The UI reacts to your code. Fail a test case, and Babidi appears in the console to mock you. Win a match, and Mr. Satan photobombs the victory screen.
* **Anti-Disconnect Grace Period:** A 10-second server buffer prevents accidental drops from immediately ruining a match, processing true forfeits via Chess Elo math.

### ⏱️ Solo Practice (Hyperbolic Time Chamber)
* A stress-free `/training` environment where users can practice Codeforces-style (Standard I/O) algorithms without risking their Power Level (Elo).
* Features dynamic background swapping—shifting from the Time Chamber dimension to the Tournament of Power upon selecting a module.

### 🏆 Progression & Hall of Legends
* **DBZ Elo Tier System:** Users progress through 7 distinct classifications (from *Earthling Fighter* up to *God of Destruction* and *Ultra Instinct*).
* **Global Leaderboard:** A highly stylized, horizontal-gradient UI that perfectly maps server-wide rankings without covering the environment art.

### 🎨 Cinematic UX/UI
* **Glassmorphism & Advanced CSS:** Heavy use of `backdrop-blur`, CSS blend modes, and transparent gradients to allow high-fidelity environment art (Kami's Lookout, Kame House) to bleed organically through the interface.
* **Framer Motion:** Smooth page transitions, levitating mascots (Piccolo guarding the login server), and a custom "Cinematic Weather Engine" (Lightning and Shenron summoning sequences).
* **Audio Engine:** Fully integrated sound design (charging Kamehamehas, UI Goku themes, teleportation effects) optimized around strict browser autoplay policies.

---

## 🛠️ Tech Stack

* **Frontend:** React (Vite), Tailwind CSS v3, Framer Motion, Monaco Editor (Code Editor)
* **Backend:** Node.js, Express.js
* **Real-Time:** Socket.io
* **Database:** MongoDB Atlas, Mongoose (Models for Users, Problems, and Matches)
* **Authentication:** JSON Web Tokens (JWT), bcrypt
* **Execution Environment:** JDoodle Compiler API

---

## ⚙️ Installation & Setup

### Prerequisites
* Node.js (v16+)
* MongoDB Atlas cluster (or local MongoDB)
* JDoodle API Credentials

### 1. Clone the repository
```bash
git clone [https://github.com/yourusername/code-strike.git](https://github.com/yourusername/code-strike.git)
cd code-strike
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key
# You can add multiple JDoodle keys to utilize the API Rotation Pool
JDOODLE_CLIENT_ID_1=your_id
JDOODLE_CLIENT_SECRET_1=your_secret
```

Start the server:
```bash
npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```

The application will be running at `http://localhost:5173`.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License
This project is licensed under the MIT License.

*Disclaimer: Code Strike is a fan-made passion project. Dragon Ball, Dragon Ball Z, Dragon Ball Super, and all related characters and images are the property of Akira Toriyama, Toei Animation, and Bird Studio.*
