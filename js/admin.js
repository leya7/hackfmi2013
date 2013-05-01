function AdminCtrl($scope){
    $scope.subjects = [];
    $scope.tags = ['баба', 'дада', 'ада'];

    $scope.getAllSubjects = function(){
        $.ajax({
            url: 'https://api.everlive.com/v1/RhGb6ryktMNcAwj9/Subject',
            type: "GET",
			dataType: 'json',
            success: function(data) {
				$scope.$apply(function() {
					//var parsedData = $.parseJSON(data);
					var parsedData = data;
					var subjects = parsedData.Result;

                    var allProvides = _.union.apply(this, _.pluck(subjects, 'Provides'));
                    var allDepends = _.union.apply(this, _.pluck(subjects, 'Depends'));
                    //$scope.tags = _.union(allProvides, allDepends);
                    
                    // ???
                    //var encodedTags = _.map($scope.tags, encodeURI);
                    //$scope.tags = ['баба', 'дада', 'ада'];


                    $( "#tags" ).autocomplete({
                        source: $scope.tags
                    });
				});

            },
            error: function(error){
                //alert(JSON.stringify(error));
            }
        });
    };

    $scope.getAllSubjects();
 }