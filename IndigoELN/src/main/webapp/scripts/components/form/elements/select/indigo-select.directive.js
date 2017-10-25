(function() {
    angular
        .module('indigoeln')
        .directive('indigoSelect', indigoSelect);

    /* @ngInject */
    function indigoSelect(formUtils) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                indigoLabel: '@',
                indigoModel: '=',
                indigoItems: '=',
                indigoDictionary: '@',
                indigoMultiple: '=',
                indigoLabelVertical: '=',
                indigoLabelColumnsNum: '=',
                indigoControl: '=',
                indigoPlaceHolder: '@',
                indigoItemProp: '@',
                indigoOrderByProp: '@',
                indigoClasses: '@',
                indigoChange: '&',
                indigoRemove: '&',
                indigoReadonly: '='
            },
            controller: controller,
            controllerAs: 'vm',
            bindToController: true,
            compile: compile,
            templateUrl: 'scripts/components/form/elements/select/select.html'
        };

        /* @ngInject */
        function compile(tElement, tAttrs) {
            tAttrs.indigoItemProp = tAttrs.indigoItemProp || 'name';
            tAttrs.indigoOrderByProp = tAttrs.indigoOrderByProp || 'rank';
            if (tAttrs.indigoMultiple) {
                tElement.find('ui-select').attr('multiple', true);
                tElement.find('ui-select-match').html('{{$item.' + tAttrs.indigoItemProp + '}}');
            }
            formUtils.doVertical(tAttrs, tElement);
            var select = tElement.find('ui-select-choices');
            var htmlContent = _.reduce(tAttrs.indigoItemProp.split(','), function(memo, num) {
                return memo + (memo.length > 0 ? ' + \' - \' + ' : '') + 'item.' + num;
            }, '');
            select.append('<span ng-bind-html="' + htmlContent + ' | highlight: $select.search"></span>');
            var repeat = select.attr('repeat');
            select.attr('repeat', repeat + ' | orderBy:"' + tAttrs.indigoOrderByProp + '"');
            formUtils.clearLabel(tAttrs, tElement);
            formUtils.setLabelColumns(tAttrs, tElement);

            return {
                post: function(scope) {
                    formUtils.addOnChange(scope);
                }
            };
        }

        /* @ngInject */
        function controller(Dictionary) {
            var vm = this;

            vm.control = vm.indigoControl || {};
            vm.control.setSelection = setSelection;
            vm.control.unSelect = unSelect;

            init();

            function setSelection(select) {
                vm.indigoModel = select;
            }

            function unSelect() {
                vm.indigoModel = {};
            }

            function init() {
                if (vm.indigoDictionary) {
                    Dictionary.getByName({
                        name: vm.indigoDictionary
                    }, function(dictionary) {
                        vm.indigoItems = dictionary.words;
                    });
                }
            }
        }
    }
})();
