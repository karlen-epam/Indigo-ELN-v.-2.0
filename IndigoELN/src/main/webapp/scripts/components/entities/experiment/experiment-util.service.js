angular
    .module('indigoeln')
    .factory('ExperimentUtil', experimentUtil);

/* @ngInject */
function experimentUtil($rootScope, $state, $uibModal, $q, Experiment, PermissionManagement) {
    return {
        printExperiment: printExperiment,
        versionExperiment: versionExperiment,
        repeatExperiment: repeatExperiment,
        reopenExperiment: reopenExperiment,
        completeExperiment: completeExperiment,
        completeExperimentAndSign: completeExperimentAndSign
    };


    function printExperiment(params) {
        $state.go('experiment-preview-print', {
            experimentId: params.experimentId,
            notebookId: params.notebookId,
            projectId: params.projectId
        });
    }


    function versionExperiment(experiment, params) {
        return Experiment.version({
            projectId: params.projectId,
            notebookId: params.notebookId
        }, experiment.name, function(result) {
            $state.go('entities.experiment-detail', {
                experimentId: result.id,
                notebookId: params.notebookId,
                projectId: params.projectId
            });
            $rootScope.$broadcast('experiment-created', {
                projectId: params.projectId,
                notebookId: params.notebookId,
                id: result.id
            });
            $rootScope.$broadcast('experiment-version-created', {
                projectId: params.projectId,
                notebookId: params.notebookId,
                name: result.name
            });
            $rootScope.$broadcast('experiment-updated', experiment);
        }).$promise;
    }


    function repeatExperiment(experiment, params) {
        experiment.accessList = PermissionManagement.expandPermission(experiment.accessList);
        var ec = experiment.components;
        var components = {
            reactionDetails: ec.reactionDetails,
            conceptDetails: ec.conceptDetails,
            reaction: ec.reaction,
            stoichTable: ec.stoichTable,
            experimentDescription: ec.experimentDescription
        };

        var experimentForSave = {
            accessList: experiment.accessList,
            components: components,
            name: experiment.name,
            status: 'Open',
            template: experiment.template
        };
        var productBatchSummary = experimentForSave.components.productBatchSummary;
        if (productBatchSummary) {
            productBatchSummary.batches = [];
        }

        return Experiment.save({
            projectId: params.projectId,
            notebookId: params.notebookId
        }, experimentForSave, function(result) {
            $state.go('entities.experiment-detail', {
                experimentId: result.id,
                notebookId: params.notebookId,
                projectId: params.projectId
            });
            $rootScope.$broadcast('experiment-created', {
                projectId: params.projectId,
                notebookId: params.notebookId,
                id: result.id
            });
        }).$promise;
    }


    function reopenExperiment(experiment, params) {
        experiment.accessList = PermissionManagement.expandPermission(experiment.accessList);
        var experimentForSave = _.extend({}, experiment, {
            status: 'Open'
        });

        return Experiment.update({
            projectId: params.projectId,
            notebookId: params.notebookId
        }, experimentForSave, function(result) {
            onChangeStatusSuccess(result, 'Open');
        }).$promise;
    }


    function completeExperiment(experiment, params, notebookName) {
        var defer = $q.defer();
        openCompleteConfirmationModal(experiment, notebookName).result.then(function() {
            experiment.accessList = PermissionManagement.expandPermission(experiment.accessList);
            var experimentForSave = _.extend({}, experiment, {
                status: 'Completed'
            });
            Experiment.update({
                projectId: params.projectId,
                notebookId: params.notebookId
            }, experimentForSave, function(result) {
                onChangeStatusSuccess(result, 'Completed');
                defer.resolve();
            });
        });

        return defer.promise;
    }


    function completeExperimentAndSign(experiment, params, notebookName) {
        openCompleteConfirmationModal(experiment, notebookName).result.then(function() {
            // show PDF preview
            $state.go('experiment-preview-submit', {
                experimentId: params.experimentId,
                notebookId: params.notebookId,
                projectId: params.projectId
            });
        });
    }

    function openCompleteConfirmationModal(experiment, notebookName) {
        return $uibModal.open({
            animation: true,
            templateUrl: 'scripts/app/entities/experiment/complete-modal/experiment-complete-modal.html',
            resolve: {
                fullExperimentName: function() {
                    var fullName = notebookName + '-' + experiment.name;
                    if (experiment.experimentVersion > 1 || !experiment.lastVersion) {
                        fullName += ' v' + experiment.experimentVersion;
                    }

                    return fullName;
                }
            },
            controller: 'ExperimentCompleteModalController',
            controllerAs: 'vm'
        });
    }

    function onChangeStatusSuccess(result, status) {
        var statuses = {};
        statuses[result.fullId] = status;
        $rootScope.$broadcast('experiment-status-changed', statuses);
    }
}

