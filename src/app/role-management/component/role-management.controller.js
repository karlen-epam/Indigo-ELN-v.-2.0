var roleManagementSaveDialogTemplate = require('../save-dialog/role-management-save-dialog.html');

/* @ngInject */
function RoleManagementController($scope, roleService, accountRoleService,
                                  $filter, $uibModal, pageInfo, notifyService) {
    var ROLE_EDITOR_AUTHORITY = 'ROLE_EDITOR';
    var vm = this;

    vm.roles = [];
    vm.accountRoles = pageInfo.accountRoles;
    vm.authorities = pageInfo.authorities;
    vm.sortBy = {
        field: 'name',
        isAscending: true
    };

    vm.search = search;
    vm.hasAuthority = hasAuthority;
    vm.updateAuthoritySelection = updateAuthoritySelection;
    vm.clear = clear;
    vm.save = prepareSave;
    vm.create = create;
    vm.edit = edit;
    vm.resetAuthorities = resetAuthorities;
    vm.sortRoles = sortRoles;
    vm.sortByAuthorities = sortByAuthorities;

    init();

    function init() {
        vm.roles = $filter('orderBy')(pageInfo.roles, 'name');

        $scope.$watch('vm.role', function(role) {
            initAuthorities(role);
        });
    }

    function search() {
        // Filtering through current table page
        var searchResult = $filter('filter')(pageInfo.roles, {
            name: vm.searchText
        });

        vm.roles = $filter('orderBy')(searchResult, 'name');
    }

    function hasAuthority(role, authority) {
        return role && role.authorities.indexOf(authority.name) !== -1;
    }

    function updateAuthoritySelection(authority) {
        var action = (authority.checked ? 'add' : 'remove');
        updateAuthorities(action, authority);
    }

    function updateAuthorities(action, authority) {
        if (action === 'add' && !vm.hasAuthority(vm.role, authority)) {
            vm.role.authorities.push(authority.name);
        }
        if (action === 'remove' && vm.hasAuthority(vm.role, authority)) {
            vm.role.authorities.splice(
                vm.role.authorities.indexOf(authority.name), 1);
        }
    }

    function clear() {
        vm.role = null;
    }

    function prepareSave() {
        if (isLastRoleWithRoleEditor()) {
            $uibModal.open({
                animation: true,
                template: roleManagementSaveDialogTemplate,
                controller: 'RoleManagementSaveController',
                controllerAs: 'vm',
                size: 'md',
                resolve: {}
            }).result.then(function(result) {
                if (result === true) {
                    save();
                }
            });
        } else {
            save();
        }
    }

    function save() {
        vm.isSaving = true;
        if (vm.role.id !== null) {
            roleService.update(vm.role, onSaveSuccess, onSaveError);
        } else {
            roleService.save(vm.role, onSaveSuccess, onSaveError);
        }
    }

    function onSaveSuccess() {
        vm.isSaving = false;
        vm.role = null;
        loadAll();
    }

    function onSaveError() {
        vm.isSaving = false;
        notifyService.error('roleService is not saved due to server error!');
        loadAll();
    }

    function loadAll() {
        accountRoleService.query({}, function(result) {
            vm.accountRoles = result;
        });
        roleService.query({}, function(result) {
            vm.roles = result;
        });
    }

    function create() {
        vm.role = {
            id: null, name: null, authorities: ['PROJECT_READER']
        };
    }

    function edit(role) {
        loadAll();
        vm.role = _.extend({}, role);
    }

    function resetAuthorities() {
        vm.role.authorities = ['PROJECT_READER'];
        initAuthorities(vm.role);
    }

    function initAuthorities(role) {
        _.each(vm.authorities, function(authority) {
            authority.checked = hasAuthority(role, authority) || authority.name === 'PROJECT_READER';
        });
    }

    function isLastRoleWithRoleEditor() {
        var roleEditorCount = 0;
        var lastRoleWithRoleEditorAuthority = false;
        vm.accountRoles.forEach(function(role) {
            if (role.authorities.indexOf(ROLE_EDITOR_AUTHORITY) >= 0) {
                roleEditorCount++;
                if (roleEditorCount > 1) {
                    lastRoleWithRoleEditorAuthority = false;

                    return;
                }
                if (vm.role.id === role.id &&
                    vm.role.authorities.indexOf(ROLE_EDITOR_AUTHORITY) === -1) {
                    lastRoleWithRoleEditorAuthority = true;
                }
            }
        });

        return lastRoleWithRoleEditorAuthority;
    }

    function sortRoles(predicate, isAscending) {
        vm.sortBy.field = predicate;
        vm.sortBy.isAscending = isAscending;
        vm.roles = $filter('orderBy')(vm.roles, predicate, !isAscending);

        $scope.$digest();
    }

    function sortByAuthorities(authority, isAscending) {
        vm.sortBy.field = authority;
        vm.sortBy.isAscending = isAscending;
        vm.roles = _.sortBy(vm.roles, function(role) {
            return isAscending
                ? role.authorities.indexOf(authority) === -1
                : role.authorities.indexOf(authority) !== -1;
        });

        $scope.$digest();
    }
}

module.exports = RoleManagementController;
