window.LuxUi.TopicViews = window.LuxUi.TopicViews || {};

var ImageView = function(viewSpec, updateCanvasesForViewType) {
  this.updateCanvasesForViewType = updateCanvasesForViewType;

  return this;
};

ImageView.prototype.updateViews = function(selection, uiGraph, viewType) {
  this.updateCanvasesForViewType(uiGraph, viewType);
};

ImageView.prototype.animateAndRender = function() {
};


ImageView.prototype.viewType = 'ImageView';

window.LuxUi.TopicViews.ImageView = ImageView;
