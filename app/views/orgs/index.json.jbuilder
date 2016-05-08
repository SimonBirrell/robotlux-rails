json.array!(@orgs) do |org|
  json.extract! org, :id, :name, :slug
  json.url org_url(org, format: :json)
end
