class NoCompression
  def compress(string)
    # do nothing to disable asset minification
    # http://stackoverflow.com/questions/9674714/disable-asset-minification-in-rails-production
    string
  end
end