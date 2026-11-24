
import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "/api/tasks";

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    project: "",
    assignedTo: "",
  });

  async function loadTasks() {
    try {
      setError("");
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Unable to load tasks.");
      }

      const data = await response.json();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.title.trim()) return;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          status: "TODO",
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to create task.");
      }

      const newTask = await response.json();

      setTasks((current) => [newTask, ...current]);

      setForm({
        title: "",
        description: "",
        project: "",
        assignedTo: "",
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeStatus(task, newStatus) {
    try {
      const response = await fetch(`${API_URL}/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...task,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to update task.");
      }

      const updatedTask = await response.json();

      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? updatedTask : item
        )
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteTask(id) {
    if (!window.confirm("Delete this task?")) return;

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete task.");
      }

      setTasks((current) =>
        current.filter((task) => task.id !== id)
      );
    } catch (err) {
      setError(err.message);
    }
  }

  const todoCount = tasks.filter(
    (task) => task.status === "TODO"
  ).length;

  const progressCount = tasks.filter(
    (task) => task.status === "IN_PROGRESS"
  ).length;

  const doneCount = tasks.filter(
    (task) => task.status === "DONE"
  ).length;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">G</span>
          <span>GroupTask</span>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <nav>
          <a className="nav-item active" href="#dashboard">
            <span>▦</span> Dashboard
          </a>
          <a className="nav-item" href="#tasks">
            <span>✓</span> My Tasks
          </a>
          <a className="nav-item" href="#projects">
            <span>▣</span> Projects
          </a>
          <a className="nav-item" href="#team">
            <span>♙</span> Team Members
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">U</div>
            <div>
              <strong>Workspace User</strong>
              <small>Team Member</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace / Overview</span>
            <h1>Dashboard</h1>
          </div>
          <div className="today">My Workspace</div>
        </header>

        <section className="welcome">
          <div>
            <span className="welcome-tag">YOUR TEAM WORKSPACE</span>
            <h2>Get things done together.</h2>
            <p>Organize your work, manage tasks and collaborate.</p>
          </div>
          <div className="welcome-decoration">✦</div>
        </section>

        <section className="stats">
          <div className="stat-card">
            <span>Total Tasks</span>
            <strong>{tasks.length}</strong>
            <small>All workspace tasks</small>
          </div>

          <div className="stat-card">
            <span>To Do</span>
            <strong>{todoCount}</strong>
            <small>Waiting to start</small>
          </div>

          <div className="stat-card">
            <span>In Progress</span>
            <strong>{progressCount}</strong>
            <small>Currently working</small>
          </div>

          <div className="stat-card">
            <span>Completed</span>
            <strong>{doneCount}</strong>
            <small>Successfully finished</small>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel" id="tasks">
            <div className="panel-heading">
              <div>
                <h2>All Tasks</h2>
                <p>Manage your team's activities</p>
              </div>
              <span className="task-count">{tasks.length} tasks</span>
            </div>

            {error && <p className="error">{error}</p>}

            {loading ? (
              <p>Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <div className="empty">
                <span>✦</span>
                <h3>No tasks yet</h3>
                <p>Create your first task using the form.</p>
              </div>
            ) : (
              <div className="task-list">
                {tasks.map((task) => (
                  <article className="task-row" key={task.id}>
                    <div className="task-info">
                      <h3>{task.title}</h3>
                      <p>{task.description}</p>
                      <div className="task-meta">
                        <span>{task.project || "General"}</span>
                        <span>Assigned to: {task.assignedTo || "Unassigned"}</span>
                      </div>
                    </div>

                    <div className="task-actions">
                      <select
                        value={task.status}
                        onChange={(e) =>
                          changeStatus(task, e.target.value)
                        }
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DONE">Done</option>
                      </select>

                      <button
                        className="delete-button"
                        onClick={() => deleteTask(task.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="panel form-panel" id="projects">
            <div className="panel-heading">
              <div>
                <h2>Create a Task</h2>
                <p>Add work to your workspace</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <label>Task title *</label>
              <input
                type="text"
                placeholder="e.g. Design homepage"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                required
              />

              <label>Description</label>
              <textarea
                placeholder="Describe the task..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />

              <label>Project</label>
              <input
                type="text"
                placeholder="e.g. Website redesign"
                value={form.project}
                onChange={(e) =>
                  setForm({ ...form, project: e.target.value })
                }
              />

              <label>Assign to</label>
              <input
                type="text"
                placeholder="Team member's name"
                value={form.assignedTo}
                onChange={(e) =>
                  setForm({ ...form, assignedTo: e.target.value })
                }
              />

              <button className="submit-button" type="submit">
                + Create Task
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
