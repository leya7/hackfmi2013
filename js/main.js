(function($) {

	Renderer = function(canvas) {
		var canvas = $(canvas).get(0)
		
		var ctx = canvas.getContext("2d");
		var particleSystem = null
		
		ctx.font="20px Arial";
		
		var that = {
			init : function(system) {

				particleSystem = system
				particleSystem.screenSize(canvas.width, canvas.height)
				particleSystem.screenPadding(100)

			},
			redraw : function() {
				ctx.clearRect(0, 0, canvas.width, canvas.height)
				
				//edge is a line and pt1 and pt2 are the position of two points that describe the line
				particleSystem.eachEdge(function(edge, pt1, pt2) {
					// this is how we set in which color to draw
					ctx.strokeStyle = "rgba(0,0,0, .7)"

					ctx.lineWidth = 1 + 6 * edge.data.weight
					ctx.beginPath()

					ctx.moveTo(pt1.x, pt1.y)
					ctx.lineTo(pt2.x, pt2.y)

					ctx.stroke()
				})

				//node is the object from data and pt is the position of the element in the frame
				particleSystem.eachNode(function(node, pt) {
					
					var w = 20
					var offset = w / 2
					
					
					ctx.fillStyle = node.data.color;
					ctx.fillRect(pt.x - offset, pt.y - offset, offset, offset)
					
					//this is how we get the width of the text so we can calculate an offset
					var textOffset = ctx.measureText(node.data.color).width / 1.5
					ctx.fillText(node.data.color, pt.x - textOffset, pt.y - offset)
					
				})
			}
		}
		return that
	}

	$(document).ready(function() {
		var sys = arbor.ParticleSystem(1000, 800, 0.3) // create the system with sensible repulsion/stiffness/friction
		
		sys.renderer = Renderer("#viewport")// our newly created renderer will have its .init() method called shortly by sys...
		
		var data = $.getJSON('data.json', function(data) {
			sys.graft({
				nodes : data.nodes,
				edges : data.edges
			})
		})
	})
})(this.jQuery)