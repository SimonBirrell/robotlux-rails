FactoryGirl.define do
  factory :org do
  	sequence :name do |n|
    	"My Org #{n}" 
    end
    sequence :slug do |n|
		"my_slug#{n}"
	end
  end

end
