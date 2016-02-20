package com.epam.indigoeln.core.service.notebook;

import com.epam.indigoeln.core.model.Notebook;
import com.epam.indigoeln.core.model.Project;
import com.epam.indigoeln.core.model.User;
import com.epam.indigoeln.core.model.UserPermission;

import com.epam.indigoeln.core.repository.notebook.NotebookRepository;
import com.epam.indigoeln.core.repository.project.ProjectRepository;
import com.epam.indigoeln.core.repository.user.UserRepository;
import com.epam.indigoeln.core.service.exception.ChildReferenceException;
import com.epam.indigoeln.core.service.exception.DuplicateFieldException;
import com.epam.indigoeln.core.service.exception.EntityNotFoundException;
import com.epam.indigoeln.core.service.exception.OperationDeniedException;
import com.epam.indigoeln.core.service.sequenceid.SequenceIdService;
import com.epam.indigoeln.core.util.SequenceIdUtil;
import com.epam.indigoeln.web.rest.dto.NotebookDTO;
import com.epam.indigoeln.web.rest.dto.ShortEntityDTO;
import com.epam.indigoeln.web.rest.dto.TreeNodeDTO;
import com.epam.indigoeln.web.rest.util.CustomDtoMapper;
import com.epam.indigoeln.web.rest.util.PermissionUtil;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class NotebookService {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private NotebookRepository notebookRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SequenceIdService sequenceIdService;

    @Autowired
    private CustomDtoMapper dtoMapper;

    public List<TreeNodeDTO> getAllNotebookTreeNodes(String projectId) {
        return getAllNotebookTreeNodes(projectId, null);
    }

    public List<TreeNodeDTO> getAllNotebookTreeNodes(String projectId, User user) {
        Collection<Notebook> notebooks = getAllNotebooks(projectId, user);
        return notebooks.stream().map(notebook -> new TreeNodeDTO(notebook, notebook.getExperiments())).sorted().collect(Collectors.toList());
    }

    /**
     * If user is null, then retrieve notebooks without checking for UserPermissions
     * Otherwise, use checking for UserPermissions
     */
    public Collection<Notebook> getAllNotebooks(String  projectId, User user) {
        Project project = Optional.ofNullable(projectRepository.findOne(projectId)).
                orElseThrow(() -> EntityNotFoundException.createWithProjectId(projectId));

        if (user == null) {
            return project.getNotebooks();
        }

        // Check of EntityAccess (User must have "Read Sub-Entity" permission in project access list)
        if (!PermissionUtil.hasPermissions(user.getId(), project.getAccessList(),
                UserPermission.READ_SUB_ENTITY)) {
            throw OperationDeniedException.createProjectSubEntitiesReadOperation(project.getId());
        }

        return getNotebooksWithAccess(project.getNotebooks(), user.getId());

    }


    public List<ShortEntityDTO> getNotebooksForExperimentCreation(User user) {
        List<Notebook> notebooks = PermissionUtil.isContentEditor(user) ?
            notebookRepository.findAllIgnoreChildren() :
            notebookRepository.findByUserIdAndPermissions(user.getId(), Collections.singletonList(UserPermission.CREATE_SUB_ENTITY));
        return notebooks.stream().map(ShortEntityDTO::new).collect(Collectors.toList());
    }

    public NotebookDTO getNotebookById(String projectId, String id, User user) {
        String fullNotebookId = SequenceIdUtil.buildFullId(projectId, id);
        Notebook notebook = Optional.ofNullable(notebookRepository.findOne(fullNotebookId)).
                orElseThrow(() -> EntityNotFoundException.createWithNotebookId(id));

        // Check of EntityAccess (User must have "Read Sub-Entity" permission in project access list and
        // "Read Entity" permission in notebook access list, or must have CONTENT_EDITOR authority)
        if (!PermissionUtil.isContentEditor(user)) {
            Project project = projectRepository.findByNotebookId(fullNotebookId);
            if (project == null) {
                throw EntityNotFoundException.createWithProjectChildId(notebook.getId());
            }

            if (!PermissionUtil.hasPermissions(user.getId(),
                    project.getAccessList(), UserPermission.READ_SUB_ENTITY,
                    notebook.getAccessList(), UserPermission.READ_ENTITY)) {
                throw OperationDeniedException.createNotebookReadOperation(notebook.getId());
            }
        }

        return new NotebookDTO(notebook);
    }

    public NotebookDTO createNotebook(NotebookDTO notebookDTO, String projectId, User user) {
        Project project = Optional.ofNullable(projectRepository.findOne(projectId)).
                orElseThrow(() -> EntityNotFoundException.createWithProjectId(projectId));

        // Check of EntityAccess (User must have "Create Sub-Entity" permission in project access list,
        // or must have CONTENT_EDITOR authority)
        if (!PermissionUtil.hasEditorAuthorityOrPermissions(user, project.getAccessList(),
                    UserPermission.CREATE_SUB_ENTITY)) {
            throw OperationDeniedException.createProjectSubEntityCreateOperation(project.getId());
        }

        Notebook notebook = dtoMapper.convertFromDTO(notebookDTO);

        // reset notebook's id
        notebook.setId(sequenceIdService.getNextNotebookId(projectId));

        // check of user permissions's correctness in access control list
        PermissionUtil.checkCorrectnessOfAccessList(userRepository, notebook.getAccessList());
        // add OWNER's permissions for specified User to notebook
        PermissionUtil.addOwnerToAccessList(notebook.getAccessList(), user);

        saveNotebookAndHandleError(notebook);

        project.getNotebooks().add(notebook);
        projectRepository.save(project);

        return new NotebookDTO(notebook);
    }

    public NotebookDTO updateNotebook(NotebookDTO notebookDTO, String projectId, User user) {
        String fullNotebookId = SequenceIdUtil.buildFullId(projectId, notebookDTO.getId());
        Notebook notebookFromDB = Optional.ofNullable(notebookRepository.findOne(fullNotebookId)).
                orElseThrow(() -> EntityNotFoundException.createWithNotebookId(notebookDTO.getId()));

        // Check of EntityAccess (User must have "Create Sub-Entity" permission in project access list and
        // "Update Entity" permission in notebook access list, or must have CONTENT_EDITOR authority)
        if (!PermissionUtil.isContentEditor(user)) {
            Project project = projectRepository.findByNotebookId(fullNotebookId);
            if (project == null) {
                throw EntityNotFoundException.createWithNotebookChildId(notebookFromDB.getId());
            }

            if (!PermissionUtil.hasPermissions(user.getId(),
                    project.getAccessList(), UserPermission.CREATE_SUB_ENTITY,
                    notebookFromDB.getAccessList(), UserPermission.UPDATE_ENTITY)) {
                throw OperationDeniedException.createNotebookUpdateOperation(notebookFromDB.getId());
            }
        }

        Notebook notebook = dtoMapper.convertFromDTO(notebookDTO);
        // check of user permissions's correctness in access control list
        PermissionUtil.checkCorrectnessOfAccessList(userRepository, notebook.getAccessList());

        notebookFromDB.setName(notebookDTO.getName());
        notebookFromDB.setAccessList(notebook.getAccessList());// Stay old notebook's experiments for updated notebook
        return new NotebookDTO(saveNotebookAndHandleError(notebookFromDB));
    }

    public void deleteNotebook(String projectId, String id) {
        String fullNotebookId = SequenceIdUtil.buildFullId(projectId, id);
        Notebook notebook = Optional.ofNullable(notebookRepository.findOne(fullNotebookId)).
                orElseThrow(() -> EntityNotFoundException.createWithNotebookId(id));

        if(notebook.getExperiments() != null && !notebook.getExperiments().isEmpty()) {
            throw new ChildReferenceException(notebook.getId());
        }

        Project project = projectRepository.findByNotebookId(fullNotebookId);
        if (project == null) {
            throw EntityNotFoundException.createWithProjectChildId(notebook.getId());
        }

        project.getNotebooks().remove(notebook);
        projectRepository.save(project);

        notebookRepository.delete(notebook);
    }

    private static List<Notebook> getNotebooksWithAccess(List<Notebook> notebooks, String userId) {
        return notebooks.stream().filter(notebook -> PermissionUtil.findPermissionsByUserId(
                notebook.getAccessList(), userId) != null).collect(Collectors.toList());
    }

    private Notebook saveNotebookAndHandleError(Notebook notebook) {
        try {
            return notebookRepository.save(notebook);
        } catch (DuplicateKeyException e) {
            throw DuplicateFieldException.createWithNotebookName(notebook.getName());
        }
    }
}