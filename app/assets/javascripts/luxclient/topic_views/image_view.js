window.LuxUi.TopicViews = window.LuxUi.TopicViews || {};

var injected = {
  topicNameToId: function (name, i) {
    name = name.replace(/\//g, '--');
    return 'topic-display-' + name.substring(2) + "-" + i.toString();
  }
};


var ImageView = function(viewSpec) {
  return this;
};

ImageView.updateViews = function(selection, uiGraph, viewType) {
  if (injected.updateCanvasesForViewType !== undefined) {
    injected.updateCanvasesForViewType(uiGraph, viewType || ImageView.prototype.viewType);
  }
};

ImageView.injectUpdateViews = function(method) {
  injected.updateCanvasesForViewType = method;
};

ImageView.tick = function() {
};

ImageView.prototype.animateAndRender = function() {
};

ImageView.prototype.update = function(node) {
  window.image = window.image || new Image();
  window.image.onload = function() {
    var context = this.canvas.getContext('2d');
    context.drawImage(window.image, 0, 0);
  }.bind(this);
  window.image.onerror = function(error) {
    console.log("Can't decode image data for image");
    console.log(error);
  };

  var imageData = node.data.message.data;
  window.image.src = "data:image/png;base64," + imageData;
};

ImageView.prototype.setScene = function(canvas, renderWidth, renderHeight) {
  this.canvas = canvas;
  $(this.canvas).attr('opacity', 1);
  this.renderWidth = renderWidth;
  this.renderHeight = renderHeight;
};

ImageView.prototype.setTopicWindowSize = function() {
};


ImageView.prototype.viewType = 'ImageView';

window.LuxUi.TopicViews.ImageView = ImageView;
