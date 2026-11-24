
package com.grouptask.backend.controller;

import com.grouptask.backend.entity.Task;
import com.grouptask.backend.entity.TaskStatus;
import com.grouptask.backend.repository.TaskRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "http://localhost:5173")
public class TaskController {

    private final TaskRepository taskRepository;

    public TaskController(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    // GET: Retrieve all tasks
    @GetMapping
    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    // GET: Retrieve one task
    @GetMapping("/{id}")
    public Task getTask(@PathVariable Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Task not found"
                    )
                );
    }

    // POST: Create a task
    @PostMapping
    public ResponseEntity<Task> createTask(@RequestBody Task task) {

        if (task.getTitle() == null || task.getTitle().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Title is required"
            );
        }

        if (task.getStatus() == null) {
            task.setStatus(TaskStatus.TODO);
        }

        task.setId(null);

        Task savedTask = taskRepository.save(task);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(savedTask);
    }

    // PUT: Update a task
    @PutMapping("/{id}")
    public Task updateTask(
            @PathVariable Long id,
            @RequestBody Task updatedTask) {

        Task existingTask = taskRepository.findById(id)
                .orElseThrow(() ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Task not found"
                    )
                );

        if (updatedTask.getTitle() == null ||
                updatedTask.getTitle().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Title is required"
            );
        }

        existingTask.setTitle(updatedTask.getTitle());
        existingTask.setDescription(updatedTask.getDescription());
        existingTask.setProject(updatedTask.getProject());
        existingTask.setAssignedTo(updatedTask.getAssignedTo());

        if (updatedTask.getStatus() != null) {
            existingTask.setStatus(updatedTask.getStatus());
        }

        return taskRepository.save(existingTask);
    }

    // DELETE: Delete a task
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {

        if (!taskRepository.existsById(id)) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Task not found"
            );
        }

        taskRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}
