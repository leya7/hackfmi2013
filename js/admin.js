function AdminCtrl($scope){
    $scope.subjects = [];
    $scope.tags = [];

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

					for(var i = 0; i < subjects.length; i++){
                        var subject = subjects[i];
						$scope.subjects.push(subject);
                        if(subject.Provides) {
                            $scope.tags = _.union($scope.tags, subject.Provides);
                        }
                        if(subject.Depends) {
                            $scope.tags = _.union($scope.tags, subject.Depends);
                        }
                    }
				});
            },
            error: function(error){
                //alert(JSON.stringify(error));
            }
        });
    };

    $scope.getAllSubjects();
 }