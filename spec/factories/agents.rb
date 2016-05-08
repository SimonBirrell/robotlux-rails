FactoryGirl.define do

	factory :agent do
  		sequence :slug do |n|
  			"my_agent#{n}"
  		end
    	association :org
  	end

end
