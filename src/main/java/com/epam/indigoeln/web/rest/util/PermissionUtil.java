package com.epam.indigoeln.web.rest.util;

import com.epam.indigoeln.core.model.Project;
import com.epam.indigoeln.core.model.User;
import com.epam.indigoeln.core.model.UserPermission;
import com.epam.indigoeln.core.repository.user.UserRepository;
import com.epam.indigoeln.core.security.Authority;
import com.epam.indigoeln.core.service.exception.EntityNotFoundException;
import com.epam.indigoeln.core.service.exception.PermissionIncorrectException;
import org.apache.commons.lang3.StringUtils;

import java.util.HashSet;
import java.util.Set;

public final class PermissionUtil {

    private PermissionUtil() {
    }

    public static boolean isContentEditor(User user) {
        return user.getAuthorities().contains(Authority.CONTENT_EDITOR);
    }

    public static UserPermission findPermissionsByUserId(
            Set<UserPermission> accessList, String userId) {
        for (UserPermission userPermission : accessList) {
            if (userPermission.getUser().getId().equals(userId)) {
                return userPermission;
            }
        }
        return null;
    }

    public static boolean hasPermissions(String userId,
                                         Set<UserPermission> accessList,
                                         String permission) {
        // Check of UserPermission
        UserPermission userPermission = findPermissionsByUserId(accessList, userId);
        return userPermission != null && userPermission.hasPermission(permission);
    }

    public static boolean hasEditorAuthorityOrPermissions(User user,
                                                          Set<UserPermission> accessList,
                                                          String permission) {
        return isContentEditor(user) || hasPermissions(user.getId(), accessList, permission);
    }

    public static boolean hasPermissions(String userId, Set<UserPermission> parentAccessList,
                                         String parentPermission,
                                         Set<UserPermission> childAccessList,
                                         String childPermission) {
        return hasPermissions(userId, parentAccessList, parentPermission)
                && hasPermissions(userId, childAccessList, childPermission);
    }

    /**
     * Adding of OWNER's permissions to Entity Access List for specified User, if it is absent.
     * @param accessList Access list
     * @param user User
     */
    public static void addOwnerToAccessList(Set<UserPermission> accessList, User user) {
        setUserPermissions(accessList, user, UserPermission.OWNER_PERMISSIONS);
    }

    /**
     * Adding Project Author as VIEWER to Experiment Access List if Experiment creator is another User.
     *
     * @param accessList        Access list
     * @param projectAuthor     Project's author
     * @param experimentCreator Experiment's creator
     */
    public static void addProjectAuthorToAccessList(Set<UserPermission> accessList,
                                                    User projectAuthor, User experimentCreator) {
        if (!StringUtils.equals(projectAuthor.getId(), experimentCreator.getId())) {
            setUserPermissions(accessList, projectAuthor, UserPermission.VIEWER_PERMISSIONS);
        }
    }

    private static void setUserPermissions(Set<UserPermission> accessList, User user, Set<String> permissions) {
        UserPermission userPermission = findPermissionsByUserId(accessList, user.getId());
        if (userPermission != null) {
            userPermission.setPermissions(permissions);
        } else {
            userPermission = new UserPermission(user, permissions);
            accessList.add(userPermission);
        }
    }

    public static boolean addUserPermissions(Set<UserPermission> accessList, User user, Set<String> permissions) {
        UserPermission userPermission = findPermissionsByUserId(accessList, user.getId());
        if (userPermission != null) {
            Set<String> existingPermissions = userPermission.getPermissions();
            if (existingPermissions == null) {
                existingPermissions = new HashSet<>();
                userPermission.setPermissions(existingPermissions);
            }
            return existingPermissions.addAll(permissions);
        } else {
            userPermission = new UserPermission(user, permissions);
            accessList.add(userPermission);
            return true;
        }
    }

    public static void checkAndSetPermissions(Set<UserPermission> accessList, Project project) {
        if (project != null) {
            for (UserPermission userPermission : project.getAccessList()) {
                UserPermission projectUserPermission =
                        findPermissionsByUserId(project.getAccessList(), userPermission.getUser().getId());
                if (projectUserPermission != null
                        && projectUserPermission.getPermissionView() != null
                        && !accessList.contains(userPermission)) {
                    accessList.add(userPermission);
                }
            }
        }
    }

    public static void checkCorrectnessOfAccessList(UserRepository userRepository,
                                                    Set<UserPermission> accessList) {
        for (UserPermission userPermission : accessList) {
            if (userPermission.getUser() == null) {
                throw PermissionIncorrectException.createWithoutUserId();
            }

            User userFromDB = userRepository.findOne(userPermission.getUser().getId());
            if (userFromDB == null) {
                throw EntityNotFoundException.createWithUserId(userPermission.getUser().getId());
            }
            userPermission.setUser(userFromDB);

            // check correctness of permissions
            for (String permission : userPermission.getPermissions()) {
                if (!UserPermission.ALL_PERMISSIONS.contains(permission)) {
                    throw PermissionIncorrectException.createWithUserIdAndPermission(
                            userPermission.getUser().getId(), permission);
                }
            }

            for(UserPermission up: accessList){
                if(up.getUser().getAuthorities().contains(Authority.CONTENT_EDITOR)){
                    up.setPermissions(UserPermission.OWNER_PERMISSIONS);
                }
            }


        }
    }
}