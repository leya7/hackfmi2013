function AdminCtrl($scope){
    $scope.subjects = [];
    $scope.tags = [];
	$scope.newSubject = {
		name: '',
		descr: '',
		depends: '',
		provides: '',
	}

    $scope.getAllSubjects = function() {
        $.ajax({
            url: 'https://api.everlive.com/v1/RhGb6ryktMNcAwj9/Subject',
            type: "GET",
			dataType: 'json',
            success: function(data) {
				$scope.$apply(function() {
					var parsedData = data;
					var subjects = parsedData.Result;

                    var allProvides = _.union.apply(this, _.pluck(subjects, 'Provides'));
                    var allDepends = _.union.apply(this, _.pluck(subjects, 'Depends'));
                    $scope.tags = _.compact(_.union(allProvides, allDepends));

					//TODO: solve this issue in more elegant way, see http://stackoverflow.com/a/13020200
					$( "#provides" ).autocomplete({
						source: $scope.tags,
						select: function() {
							setTimeout(function() {
								$( "#provides" ).trigger('input');
							}, 0);
						}	
					});
					$( "#depends" ).autocomplete({
						source: $scope.tags,
						select: function() {
							setTimeout(function() {
								$( "#depends" ).trigger('input');
							}, 0);
						}	
					});

				});

            },
            error: function(error){
                //alert(JSON.stringify(error));
            }
        });
    };
	
	$scope.submitNewSubject = function() {
		alert('New subject: ' + JSON.stringify($scope.newSubject));
		/*$.ajax({
            url: 'https://api.everlive.com/v1/RhGb6ryktMNcAwj9/Subject',
            type: "POST",
			dataType: 'json',
            success: function(data) {
				// do something
            },
            error: function(error){
                alert('Unable to submit subject; error: ' + JSON.stringify(error));
            }
        });*/
	};

    $scope.getAllSubjects();

	$( "#tags" ).autocomplete({
		source: $scope.tags
	});
}