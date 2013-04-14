Renderer = function(canvas) {
	var canvas = $(canvas).get(0);

	var ctx = canvas.getContext("2d");
	var particleSystem = null;

	ctx.font = "20px Verdana";
	
	var that = {
		init : function(system) {

			particleSystem = system;
			particleSystem.screenSize(canvas.width, canvas.height);
			particleSystem.screenPadding(100);

			var resizeCanvas =  function(){
				ctx.canvas.width  = window.innerWidth*0.8;
				ctx.canvas.height = window.innerHeight*0.8;
				particleSystem.screenSize(canvas.width, canvas.height);
			};
			
			window.onresize = function(){
				resizeCanvas();
			};
			
			resizeCanvas();
			
			that.initMouseHandling();
			
			
		},
		redraw : function() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			//edge is a line and pt1 and pt2 are the position of two points that describe the line
			particleSystem.eachEdge(function(edge, pt1, pt2) {
				// this is how we set in which color to draw
				ctx.strokeStyle = edge.color;

				ctx.lineWidth = edge.lineWidth;
				ctx.beginPath();

				ctx.moveTo(pt1.x, pt1.y);
				ctx.lineTo(pt2.x, pt2.y);
				//ctx.arc(pt2.x, pt2.y, 6, 0, 180, true);

				//adds arrows, however they end up in weird positions
				//after the initial "shake"

				var angle = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x);
				var len = 16;
				//Math.sqrt((p2.y - p1.y) * (p2.y - p1.y) +
				//    (p2.x - p1.x) * (p2.x - p1.x));

				ctx.moveTo(pt2.x - 5, pt2.y - 5);
				ctx.lineTo(pt2.x - len * Math.cos(angle - Math.PI / 6), pt2.y - len * Math.sin(angle - Math.PI / 6));
				ctx.moveTo(pt2.x - 5, pt2.y - 5);
				ctx.lineTo(pt2.x - len * Math.cos(angle + Math.PI / 6), pt2.y - len * Math.sin(angle + Math.PI / 6));
				ctx.stroke();
			})
			//node is the object from data and pt is the position of the element in the frame
			particleSystem.eachNode(function(node, pt) {

				var w = 20;
				var offset = w / 2;

				ctx.fillStyle = 'rgb(0, 0, 0)';
				ctx.fillRect(pt.x - offset, pt.y - offset, offset, offset);

				//this is how we get the width of the text so we can calculate an offset
				var textOffset = ctx.measureText(node.data.label).width / 1.5;
				ctx.fillText(node.data.label, pt.x - textOffset, pt.y - offset);

			})
		},
		initMouseHandling : function() {
			// no-nonsense drag and drop (thanks springy.js)
			selected = null;
			nearest = null;
			var dragged = null;
			var oldmass = 1;

			$(canvas).mousedown(function(e) {
				var pos = $(this).offset();
				var mouseP = {

					x : e.pageX - pos.left,
					y : e.pageY - pos.top,
			};
				var nearestP = particleSystem.nearest(mouseP);

				if(nearestP.distance < 20){
					selected = nearest = dragged = nearestP;
				}
				that.printInfo(selected);

				if (selected) {
					dragged.node.fixed = true;
				}
				return false;
			});

			$(canvas).mousemove(function(e) {
				var old_nearest = nearest && nearest.node._id
				var pos = $(this).offset();
				var mouseP = {
					x : e.pageX - pos.left,
					y : e.pageY - pos.top
				};

				nearest = particleSystem.nearest(mouseP);

				if (!nearest)
					return;

				if (dragged) {
					var p = particleSystem.fromScreen(mouseP)
					dragged.node.p = {
						x : p.x,
						y : p.y
					};
				}

				return false;
			});

			$(window).bind('mouseup', function(e) {
				try{
					if (dragged === null || dragged.node === undefined)
						return dragged.node.fixed = false;
					dragged.node.tempMass = 100;
					dragged = null;
					selected = null;
					nearest = null;
					return false;
				}catch(e){}
			});

		},
		printInfo : function(selectedSubject) {
			var defaultColor = "rgba(0,0,0, .7)";
			
			particleSystem.eachEdge(function(edge, pt1, pt2) {
				edge.color = defaultColor;
				edge.lineWidth = 2;
			});
				
			if(selectedSubject) {
				g_selectedSubject = g_subjects[selectedSubject.node.name];
				$('#SelectedSubject').fadeIn();
				$('#SubjectName').text(g_selectedSubject.Name);
				$('#SubjectDescr').text(g_selectedSubject.Description);
				$('#SubjectProvides').text(g_selectedSubject.Provides.toString().replace(/\,/g, ', '));
				$('#SubjectDepends').text((g_selectedSubject.Depends == null) ? "знания от училище" : g_selectedSubject.Depends.toString().replace(/\,/g, ', '));
				/*var defaultColor = "rgba(0,0,0, .7)";

				particleSystem.eachEdge(function(edge, pt1, pt2) {
					edge.color = defaultColor;
					edge.lineWidth = 2;
				});*/
				
				var visitOut = function(node, level) {
				    particleSystem.eachEdge(function(cur, pt1, pt2) {
				        if(node.name == cur.source.name) {    // node -> cur
							cur.color = "rgba(" + (100 + (50 * level)) + ",0," + (100 + (20 * level)) + ", 1)";
							cur.lineWidth = 2 + (5 - level * 2);
				            visitOut(cur.target, level + 1);
				        }
				    });
				};
				var visitIn = function(node, level) {
				    particleSystem.eachEdge(function(cur, pt1, pt2) {
				        if(node.name == cur.target.name) {    // node <- cur
							cur.color = "rgba(0," + (100 + (50 * level)) + "," + (100 + (20 * level)) + ", 1)";
							cur.lineWidth = 2 + (5 - level * 2);
				            visitIn(cur.source, level + 1);
				        }
				    });
				};
				g_selectedSubject.name = g_selectedSubject.Name;
				visitOut(g_selectedSubject, 0);
				visitIn(g_selectedSubject, 0);
			} else {
				$('#SelectedSubject').fadeOut();
			}
		}
	}
	return that;
}

