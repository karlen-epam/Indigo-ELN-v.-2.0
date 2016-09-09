angular.module('indigoeln')
    .controller('StructureExportModalController', function ($scope, $uibModalInstance, $window, structureToSave, structureType, FileSaver) {

        var formats = {
            molecule: [{name: 'MDL Molfile'}],
            reaction: [{name: 'RXN File'}]
        };

        $scope.structureToSave = structureToSave;
        // the only value at this moment
        $scope.formats = formats[structureType];
        $scope.format = $scope.formats[0];

        $scope.download = function() {

            var text = $scope.structureToSave.replace(/\n/g, '\r\n'),
                isMol = structureType === 'molecule',
                fileExt = isMol ? 'mol' : 'rxn';

            //to generate file name
            var NUM_MAX = 999, NUM_MIN = 100, ORDER = 1000;
            var filename = fileExt + '-' + Math.floor(Math.random(NUM_MIN,NUM_MAX)*ORDER) + '.' + fileExt;
            var data = new Blob([text], { type: 'text/plain;charset=utf-8' });

            FileSaver.saveAs(data, filename);
            $uibModalInstance.close();
        };

        $scope.cancel = function() {
            $uibModalInstance.dismiss('cancel');
        };
    });