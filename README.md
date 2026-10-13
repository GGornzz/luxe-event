
# ✦ LUXE EVENT
### Event Registration & Management System

LUXE EVENT is a full-stack web application for creating, managing, and registering for events.

The website features a premium Midnight Gold & Neon Purple design, built with HTML, CSS, JavaScript, Node.js, Express.js, and MongoDB.

## Features

- Create new events
- View all events
- Edit event information
- Delete events
- Register for events
- Prevent duplicate email registrations
- Limit registrations based on event capacity
- View registered attendees
- Cancel registrations
- Search and filter events
- Display event and registration statistics
- Responsive user interface

## Technologies Used

### Frontend
- HTML5
- CSS3
- JavaScript
- Fetch API

### Backend
- Node.js
- Express.js

### Database
- MongoDB
- MongoDB Node.js Driver

### Development Tools
- Visual Studio Code
- MongoDB Compass
- Chrome DevTools
- Git & GitHub

## Project Structure

```text
luxe-event/
├── server/
│   ├── app.js
│   └── db.js
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── screenshots/
│   ├── debug-1.png
│   └── debug-2.png
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/GGornzz/luxe-event.git
cd luxe-event
```


### 2. Install dependencies

Make sure Node.js and MongoDB Community Server are installed.

```bash
npm install
```

### 3. Start MongoDB

Make sure MongoDB Server is running on:

```text
mongodb://127.0.0.1:27017
```

The application uses the database:

```text
luxe-event-db
```

MongoDB collections:

- `events`
- `registrations`

### 4. Run the application

```bash
npm run dev
```

### 5. Open the website

Visit:

http://localhost:3000

## API Endpoints

### Event Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/test` | Test API and database connection |
| GET | `/api/events` | Get all events |
| GET | `/api/events/:id` | Get an event by ID |
| POST | `/api/events` | Create a new event |
| PUT | `/api/events/:id` | Update event information |
| DELETE | `/api/events/:id` | Delete an event |

### Registration Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/events/:id/register` | Register for an event |
| GET | `/api/events/:id/registrations` | Get registered attendees |
| DELETE | `/api/registrations/:id` | Cancel a registration |

## Example API Request

### Create an event

**POST** `/api/events`

```json
{
  "title": "LUXE Music Festival",
  "description": "A premium music festival experience",
  "date": "2026-11-20",
  "time": "18:00",
  "location": "Bangkok",
  "capacity": 100
}
```

### Register for an event

**POST** `/api/events/:id/register`

```json
{
  "name": "Somchai",
  "email": "somchai@example.com"
}
```

## Database Design

### Collection: events

Stores information about each event.

Fields:

- `_id`
- `title`
- `description`
- `date`
- `time`
- `location`
- `capacity`
- `registeredCount`
- `createdAt`

### Collection: registrations

Stores attendee registration information.

Fields:

- `_id`
- `eventId`
- `name`
- `email`
- `registeredAt`

The `eventId` field references an event in the `events` collection.

A unique index on `eventId` and `email` prevents duplicate registrations for the same event.

## Debugging Evidence

### Screenshot 1: API Debugging

This screenshot demonstrates HTTP requests and responses inspected using Chrome DevTools.

![API Debugging](screenshots/debug-1.png)

### Screenshot 2: MongoDB Verification

This screenshot shows data stored in MongoDB and inspected using MongoDB Compass.

![MongoDB Debugging](screenshots/debug-2.png)

## How It Works

1. The user interacts with the frontend interface.
2. JavaScript sends HTTP requests using the Fetch API.
3. Express.js receives and processes API requests.
4. The backend performs database operations in MongoDB.
5. MongoDB stores event and registration information.
6. The frontend updates the interface using the API response.

## Limitations

This project is intended for local development and educational demonstration.

It does not currently include administrator authentication or role-based access control.

Production deployment would require additional security controls, including authentication, authorization, and protections for attendee information.

## Author

Developed as Mini Project #2.

Full-Stack Web Development with Node.js, Express.js, and MongoDB.

## License

Educational project.
