'use strict';

angular.module('indigoeln')
    .controller('ExperimentDetailController',
        function ($scope, $rootScope, $stateParams, $state, Experiment, Principal, PermissionManagement, pageInfo,
                  SignatureTemplates, $uibModal) {

            // TODO: the Action drop up button should be disable in case of there is unsaved data.

            $scope.statuses = ['Open', 'Completed', 'Submit_Fail', 'Submitted', 'Archived', 'Signing', 'Signed'];

            $scope.experiment = pageInfo.experiment;
            $scope.notebook = pageInfo.notebook;
            $scope.experimentId = $stateParams.experimentId;

            PermissionManagement.setEntity('Experiment');
            PermissionManagement.setAuthor($scope.experiment.author);
            PermissionManagement.setAccessList($scope.experiment.accessList);

            var setStatus = function (status) {
                $scope.experiment.status = status;
            };

            var onAccessListChangedEvent = $scope.$on('access-list-changed', function () {
                $scope.experiment.accessList = PermissionManagement.getAccessList();
            });

            var onExperimentStatusChangedEvent = $scope.$on('experiment-status-changed', function(event, data) {
                _.each(data, function(status, id) {
                    if (id === $scope.experiment.fullId) {
                        setStatus(status);
                    }
                });
            });

            $scope.$on('$destroy', function () {
                onAccessListChangedEvent();
                onExperimentStatusChangedEvent();
            });

            PermissionManagement.hasPermission('UPDATE_ENTITY').then(function (hasEditPermission) {
                $scope.isEditAllowed = pageInfo.isContentEditor || pageInfo.hasEditAuthority && hasEditPermission;
            });

            Principal.hasAuthority('CONTENT_EDITOR').then(function (result) {
                $scope.isContentEditor = result;
            });

            var onSaveSuccess = function () {
                $scope.isSaving = false;
            };

            var onSaveError = function () {
                $scope.isSaving = false;
            };

            $scope.save = function (experiment) {
                $scope.isSaving = true;
                experiment.accessList = PermissionManagement.expandPermission(experiment.accessList);
                var experimentForSave = _.extend({}, experiment);
                if (experiment.template !== null) {
                    $scope.loading = Experiment.update({
                        notebookId: $stateParams.notebookId,
                        projectId: $stateParams.projectId
                    }, experimentForSave, onSaveSuccess, onSaveError).$promise;
                } else {
                    $scope.loading = Experiment.save(experimentForSave, onSaveSuccess, onSaveError).$promise;
                }
            };

            $scope.$watch('experiment.status', function () {
                $scope.isEditAllowed = $scope.isStatusOpen();
            });

            var onChangeStatusSuccess = function (result, status) {
                onSaveSuccess(result);
                var statuses = {};
                statuses[result.fullId] = status;
                $rootScope.$broadcast('experiment-status-changed', statuses);
            };

            var openCompleteConfirmationModal = function () {
                return $uibModal.open({
                    animation: true,
                    templateUrl: 'scripts/app/entities/experiment/experiment-complete-modal.html',
                    resolve: {
                        fullExperimentName: function () {
                            var fullName = $scope.notebook.name + '-' + $scope.experiment.name;
                            if ($scope.experiment.experimentVersion > 1 || !$scope.experiment.lastVersion) {
                                fullName += ' v' + $scope.experiment.experimentVersion;
                            }
                            return fullName;
                        }
                    },
                    controller: function ($scope, $uibModalInstance, fullExperimentName) {
                        $scope.fullExperimentName = fullExperimentName;
                        $scope.dismiss = function () {
                            $uibModalInstance.dismiss('cancel');
                        };
                        $scope.confirmCompletion = function () {
                            $uibModalInstance.close(true);
                        };
                    }
                });
            };

            $scope.completeExperiment = function () {
                openCompleteConfirmationModal().result.then(function () {
                    $scope.isSaving = true;
                    $scope.experiment.accessList = PermissionManagement.expandPermission($scope.experiment.accessList);
                    var experimentForSave = _.extend({}, $scope.experiment, {status: 'Completed'});
                    $scope.loading = Experiment.update({
                        projectId: $stateParams.projectId,
                        notebookId: $stateParams.notebookId
                    }, experimentForSave, function(result) {
                        onChangeStatusSuccess(result, 'Completed');
                    }, onSaveError).$promise;
                });
            };

            $scope.completeExperimentAndSign = function () {
                openCompleteConfirmationModal().result.then(function () {
                    // show PDF preview
                    $state.go('experiment-preview-submit', {
                            experimentId: $scope.experiment.id,
                            notebookId: $scope.notebook.id,
                            projectId: $scope.notebook.parentId
                        });
                    //$state.go('entities.experiment-detail.preview-submit');
                });
            };

            $scope.reopenExperiment = function () {
                $scope.isSaving = true;
                $scope.experiment.accessList = PermissionManagement.expandPermission($scope.experiment.accessList);
                var experimentForSave = _.extend({}, $scope.experiment, {status: 'Open'});
                $scope.loading = Experiment.update({
                    projectId: $stateParams.projectId,
                    notebookId: $stateParams.notebookId
                }, experimentForSave, function(result) {
                    onChangeStatusSuccess(result, 'Open');
                }, onSaveError).$promise;
            };

            $scope.repeatExperiment = function () {
                $scope.isSaving = true;
                $scope.experiment.accessList = PermissionManagement.expandPermission($scope.experiment.accessList);
                var experimentForSave = {
                    accessList: $scope.experiment.accessList,
                    components: $scope.experiment.components,
                    name: $scope.experiment.name,
                    status: 'Open',
                    template: $scope.experiment.template
                };
                var productBatchSummary = experimentForSave.components.productBatchSummary;
                if (productBatchSummary) {
                    productBatchSummary.batches = [];
                }
                $scope.loading = Experiment.save({
                    projectId: $stateParams.projectId,
                    notebookId: $stateParams.notebookId
                }, experimentForSave, function (result) {
                    onSaveSuccess(result);
                    $state.go('entities.experiment-detail', {
                        experimentId: result.id,
                        notebookId: $stateParams.notebookId,
                        projectId: $stateParams.projectId
                    });
                    $rootScope.$broadcast('experiment-created', {
                        projectId: $stateParams.projectId,
                        notebookId: $stateParams.notebookId,
                        id: result.id
                    });
                }, onSaveError).$promise;
            };

            $scope.versionExperiment = function () {
                $scope.isSaving = true;
                $scope.loading = Experiment.version({
                    projectId: $stateParams.projectId,
                    notebookId: $stateParams.notebookId
                }, $scope.experiment.name, function (result) {
                    onSaveSuccess(result);
                    $state.go('entities.experiment-detail', {
                        experimentId: result.id,
                        notebookId: $stateParams.notebookId,
                        projectId: $stateParams.projectId
                    });
                    $rootScope.$broadcast('experiment-created', {
                        projectId: $stateParams.projectId,
                        notebookId: $stateParams.notebookId,
                        id: result.id
                    });
                    $rootScope.$broadcast('experiment-version-created', {
                        projectId: $stateParams.projectId,
                        notebookId: $stateParams.notebookId,
                        name: result.name
                    });
                }, onSaveError).$promise;
            };

            $scope.isStatusOpen = function () {
                return $scope.experiment.status === 'Open';
            };
            $scope.isStatusComplete = function () {
                return $scope.experiment.status === 'Completed';
            };
            $scope.isStatusSubmitFail = function () {
                return $scope.experiment.status === 'Submit_Fail';
            };
            $scope.isStatusSubmitted = function () {
                return $scope.experiment.status === 'Submitted';
            };
            $scope.isStatusArchieved = function () {
                return $scope.experiment.status === 'Archived';
            };
            $scope.isStatusSigned = function () {
                return $scope.experiment.status === 'Signed';
            };
            $scope.isStatusSigning = function () {
                return $scope.experiment.status === 'Signing';
            };

        });
